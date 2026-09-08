'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import type { PersonTone } from '@/entities/crm/lib/palette';
import type { WorkTypeTone } from '@/entities/work-type/model';
import { crmClashContent } from '@/entities/crm/content';
import type { DayKey } from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { useCalendarActions } from './actions';
import { columnShift, dayOfDrop, isDraggable, movedBlock, rangeShift } from './drag';
import { capturePointer, releasePointer } from './pointer';
import { crmContent as texts } from './content';
import { EventPopover } from './EventPopover';
import { DURATION_STEP_MIN, MIN_EVENT_MIN } from './model';
import { LANES_ABREAST, type ScheduleItem } from './schedule';
import styles from './EventChip.module.css';

/** Как показана запись: прямоугольник в сетке, строка в полосе или в месяце. */
export type ChipVariant = 'slot' | 'bar' | 'row';

/**
 * Место записи в колонке — доли суток и доли ширины, посчитанные раскладкой.
 *
 * Проценты, а не пиксели: высота часа живёт одной переменной в CSS, и запись
 * обязана следовать за ней, не зная её значения.
 */
export type ChipPlace = {
  readonly topPercent: number;
  readonly heightPercent: number;
  readonly leftPercent: number;
  readonly widthPercent: number;
  readonly depth: number;
  /**
   * Рядом стоит метка «+N» свёрнутого остатка: запись оставляет ей поле
   * справа, иначе имя уезжает под метку и обрывается без многоточия.
   */
  readonly crowded?: boolean | undefined;
};

export interface EventChipProps {
  readonly item: ScheduleItem;
  readonly variant?: ChipVariant | undefined;
  /** Позиция в сетке часов. У строки в полосе и в месяце её нет. */
  readonly place?: ChipPlace | undefined;
  /** Можно ли двигать запись мышью. Ускоритель, а не единственный путь. */
  readonly draggable?: boolean | undefined;
  /**
   * Дни показанных колонок по порядку — по ним считается перенос вбок
   * (issue #143). Массив строк, а не функция: сетка серверная, и функция
   * границу сервер→клиент не переживает. Пусто — переносить некуда.
   */
  readonly days?: readonly DayKey[] | undefined;
  /**
   * Запись найдена поиском — её подсвечивают, чтобы глаз нашёл её в сетке
   * (issue #132). Признак приходит пропом, а не читается из адреса: чип
   * рисуется в трёх видах и в полосе «весь день», и знание о маршрутизации в
   * листе сделало бы его непроверяемым без роутера.
   */
  readonly focused?: boolean | undefined;
}

const MINUTES_IN_DAY = 24 * 60;

/**
 * Краска человека → класс модуля. Прямой перевод, а не сборка имени строкой:
 * так линтер видит, что все шесть классов используются, а неизвестная краска
 * не даёт запись без оформления.
 */
const PERSON_CLASS: Record<PersonTone, string> = {
  a: styles.personA ?? '',
  b: styles.personB ?? '',
  c: styles.personC ?? '',
  d: styles.personD ?? '',
  e: styles.personE ?? '',
  f: styles.personF ?? '',
};

/**
 * Краска вида работ → класс модуля. Прямой перевод, а не сборка имени
 * строкой: так линтер видит, что все семь классов используются, а краска,
 * которой в модуле нет, не даёт запись без оформления (ADR-343).
 */
const TONE_CLASS: Record<WorkTypeTone, string> = {
  accent: styles.toneAccent ?? '',
  info: styles.toneInfo ?? '',
  ok: styles.toneOk ?? '',
  warn: styles.toneWarn ?? '',
  sale: styles.toneSale ?? '',
  error: styles.toneError ?? '',
  neutral: styles.toneNeutral ?? '',
};

/** Сколько держится подсветка находки. */
const FOUND_MS = 5000;

/** Ниже этого сдвига движение считается кликом, а не перетаскиванием. */
const DRAG_THRESHOLD_PX = 4;

/**
 * Слой записи, которую тащат. Колонки — соседи в разметке, и сдвинутая вбок
 * запись без этого уезжала бы под содержимое следующей колонки.
 *
 * Число не угадано: дорожки в колонке ограничены `laneLimit` (в неделе одна, в
 * дне — `LANES_ABREAST`), остаток сворачивается в «+N», поэтому глубина записи
 * никогда не превышает `LANES_ABREAST - 1`, а её слой — `LANES_ABREAST`. Один
 * сверху и есть «поверх всех».
 */
const DRAG_DEPTH = LANES_ABREAST + 1;

type Drag = {
  readonly mode: 'move' | 'start' | 'end';
  readonly startX: number;
  readonly startY: number;
  readonly fromMin: number;
  readonly toMin: number;
  /** Минут в пикселе по вертикали. Ноль — вертикали у поверхности нет. */
  readonly perPx: number;
  /** Ширина колонки дня в пикселях: по ней считается перенос вбок. */
  readonly columnWidth: number;
};

/** Куда запись уехала за курсором, пока её не отпустили. */
type Shift = {
  readonly fromMin: number;
  readonly toMin: number;
  readonly day: DayKey;
  /**
   * Сдвиг вбок в колонках, уже зажатый краями показанного. Он же отвечает на
   * вопрос «жест что-нибудь изменил?»: у многодневной отлучки день первого
   * куска мог остаться прежним, а диапазон — переехать.
   */
  readonly columns: number;
  /** Сдвиг вбок в пикселях: колонка чужая, а место в ней своё. */
  readonly offsetPx: number;
};

/** Округление до шага: перетаскивание не должно давать «10:07». */
function snap(minutes: number): number {
  return Math.round(minutes / DURATION_STEP_MIN) * DURATION_STEP_MIN;
}

/**
 * Запись календаря: прямоугольник в сетке часов, строка в полосе «весь день»
 * и в клетке месяца.
 *
 * 🔴 Клиентский лист, а не клиентский календарь: сетка, шапки и позиции
 * приходят с сервера готовыми (инвариант 1), интерактивна только сама запись.
 *
 * 🔴 Мышиные ускорители не заменяют клавиатуру (CRM §3.5.1). Перетаскивание и
 * растягивание краёв — удобство для мыши; то же самое делается кнопкой
 * «Изменить» в карточке записи, а карточка открывается Enter и Space, потому
 * что запись — обычная кнопка.
 */
export function EventChip({
  item,
  variant = 'slot',
  place,
  draggable = false,
  days = [],
  focused = false,
}: EventChipProps) {
  const actions = useCalendarActions();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const movedRef = useRef(false);

  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState(false);
  /* Сдвиг во время перетаскивания: запись едет за курсором, а сохраняется
     один раз — на отпускании. Промежуточные запросы залили бы сервер. */
  const [shift, setShift] = useState<Shift | null>(null);

  const edit = item.edit;
  /* 🔴 Пока по записи идёт сохранение, жест по ней не начинается. На экране
     до прихода новой сетки стоит прежний черновик, и второй жест посчитался
     бы от него: сервер получил бы те же даты второй раз, а объявление
     отчиталось бы о новых — человеку сказали бы «перенесено», хотя запись
     осталась там же (#144). */
  const busy = edit !== null && actions.pending === edit.id;
  const canDrag = draggable && isDraggable(item) && !busy;
  /* 🔴 Отлучку двигают только вбок: её время задаёт окно «с 11 до 20» в форме,
     и одно движение мышью не имеет права менять заодно и его (#144). */
  const sideOnly = edit !== null && edit.kind === 'block';

  const show = (): void => {
    const rect = buttonRef.current?.getBoundingClientRect() ?? null;
    setAnchor(rect);
    setOpen(true);
  };

  const hide = (): void => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, mode: Drag['mode']): void => {
    if (!canDrag || event.button !== 0) return;

    /* Поверхность, по которой считается жест, меряется сама: и высота часа, и
       ширина колонки живут в CSS, а общая с ним константа разошлась бы с
       раскладкой на первой правке шаблона.

       Их две. Колонка часов покрывает ровно сутки — из её высоты выводится
       минута в пикселе, а её ширина и есть ширина дня. Полоса «весь день»
       лежит поперёк всех колонок сразу: вертикали у неё нет вовсе, а колонка
       дня — её ширина, делённая на число показанных дней. */
    const surface = buttonRef.current?.closest('[data-track],[data-days]');
    if (!(surface instanceof HTMLElement)) return;

    const rect = surface.getBoundingClientRect();
    const across = surface.dataset['days'] !== undefined;
    const columnWidth = across ? rect.width / Math.max(days.length, 1) : rect.width;
    const perPx = across || rect.height <= 0 ? 0 : MINUTES_IN_DAY / rect.height;
    // неизмеренная поверхность двигать запись не может — это состояние до отрисовки
    if (perPx === 0 && columnWidth <= 0) return;

    event.stopPropagation();
    capturePointer(event.currentTarget, event.pointerId);

    movedRef.current = false;
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      fromMin: item.fromMin,
      toMin: item.toMin,
      perPx,
      columnWidth,
    };
  };

  const onMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null) return;

    const deltaPx = event.clientY - drag.startY;
    const sidePx = event.clientX - drag.startX;
    /* Порог считается по обеим осям: перенос на соседний день — движение
       вбок, и требовать от него ещё и вертикали значило бы не давать его
       вовсе. */
    if (
      !movedRef.current &&
      Math.abs(deltaPx) < DRAG_THRESHOLD_PX &&
      Math.abs(sidePx) < DRAG_THRESHOLD_PX
    )
      return;

    movedRef.current = true;
    const delta = snap(deltaPx * drag.perPx);

    if (drag.mode === 'move' && sideOnly) {
      /* 🔴 Диапазон едет целиком, и считается он по записи, а не по её куску
         в этой колонке: полоса отпуска обрезана краем недели, и сдвиг,
         зажатый по первому видимому дню, не пустил бы её назад (#144). */
      const span = item.span;
      const columns = rangeShift(
        days,
        span?.fromDay ?? item.day,
        span?.toDay ?? item.day,
        columnShift(sidePx, drag.columnWidth),
      );

      setShift({
        fromMin: item.fromMin,
        toMin: item.toMin,
        day: item.day,
        columns,
        offsetPx: columns * drag.columnWidth,
      });
      return;
    }

    if (drag.mode === 'move') {
      const length = drag.toMin - drag.fromMin;
      const from = Math.min(Math.max(drag.fromMin + delta, 0), MINUTES_IN_DAY - length);
      /* 🔴 День меняется, время остаётся тем, что показано (ADR-165): по
         вертикали запись двигают отдельно, и одно движение не должно молча
         менять оба. */
      const index = days.indexOf(item.day);
      const day = dayOfDrop(days, item.day, columnShift(sidePx, drag.columnWidth));

      const columns = index < 0 ? 0 : days.indexOf(day) - index;

      setShift({
        fromMin: from,
        toMin: from + length,
        day,
        columns,
        offsetPx: columns * drag.columnWidth,
      });
      return;
    }

    if (drag.mode === 'start') {
      const from = Math.min(Math.max(drag.fromMin + delta, 0), drag.toMin - MIN_EVENT_MIN);
      setShift({ fromMin: from, toMin: drag.toMin, day: item.day, columns: 0, offsetPx: 0 });
      return;
    }

    const to = Math.min(Math.max(drag.toMin + delta, drag.fromMin + MIN_EVENT_MIN), MINUTES_IN_DAY);
    setShift({ fromMin: drag.fromMin, toMin: to, day: item.day, columns: 0, offsetPx: 0 });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag === null) return;

    releasePointer(event.currentTarget, event.pointerId);

    const next = shift;
    setShift(null);
    if (!movedRef.current || next === null || edit === null) return;

    /* 🔴 Жест, ничего не изменивший, — это клик, а не перенос (issue #143).
       Палец на тач-экране уезжает вбок на несколько пикселей у каждого тапа;
       такой снос не меняет ни дня, ни часа — но, посчитанный движением, он
       отправлял бы на сервер правку с прежними значениями и заодно съедал
       нажатие, ради которого карточка и открывается. То же спасает от пустой
       правки по вертикали: сдвиг на три минуты садится обратно на свой шаг. */
    if (
      next.columns === 0 &&
      next.day === item.day &&
      next.fromMin === item.fromMin &&
      next.toMin === item.toMin
    ) {
      movedRef.current = false;
      return;
    }

    if (edit.kind === 'block') {
      actions.moveBlock(edit.id, movedBlock(edit.draft, next.columns));
      return;
    }

    actions.move(edit.id, {
      ...edit.draft,
      day: next.day,
      time: timeOfMinutes(next.fromMin),
      durationMin: Math.max(next.toMin - next.fromMin, MIN_EVENT_MIN),
    });
  };

  /* Перетаскивание кончается кликом браузера — открывать карточку после него
     нельзя: человек двигал запись, а не спрашивал о ней. */
  const onClick = (): void => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    show();
  };

  /* Подсветка снимается, как только на запись посмотрели: иначе она висит,
     пока человек не сотрёт параметр из адреса руками. Пять секунд — столько
     нужно, чтобы глаз нашёл её в сетке. */
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (!focused) return;

    const timer = setTimeout(() => setFaded(true), FOUND_MS);
    return () => clearTimeout(timer);
  }, [focused]);

  /* 🔴 Краска человека перебивает краску вида работ (ADR-123): в наложении
     важнее, чей это выезд, чем монтаж это или ТО. */
  const classes = [
    styles.chip,
    styles[variant],
    item.person === null ? TONE_CLASS[item.tone] : PERSON_CLASS[item.person.tone],
    /* Запись человека из слоя занятости: краска у неё своя, и контур той же
       краской — единственное, что читается в тёмной теме (см. модуль). */
    item.person === null ? null : styles.marked,
    styles[item.entity],
    item.muted ? styles.muted : null,
    item.clash ? styles.clash : null,
    item.overtimeMin > 0 ? styles.overtime : null,
    shift === null ? null : styles.dragging,
    place?.crowded === true ? styles.crowded : null,
    open ? styles.open : null,
    focused && !faded ? styles.found : null,
  ]
    .filter(Boolean)
    .join(' ');

  /* Пока запись едет за курсором, её место считается здесь: сервер об этом
     ещё не знает, а прыжок «отпустил — вернулось — переехало» читается как
     сбой. Проценты — та же мера, что у сетки (см. `offsetPercent`). */
  const slotStyle =
    place === undefined
      ? undefined
      : {
          top: `${shift === null ? place.topPercent : (shift.fromMin / MINUTES_IN_DAY) * 100}%`,
          height: `${
            shift === null
              ? place.heightPercent
              : ((shift.toMin - shift.fromMin) / MINUTES_IN_DAY) * 100
          }%`,
          left: `${place.leftPercent}%`,
          width: `${place.widthPercent}%`,
          zIndex: shift === null ? place.depth + 1 : DRAG_DEPTH,
          /* Пока запись едет вбок, она остаётся в своей колонке и просто
             сдвинута: перевешивать её в чужую полосу посреди жеста значило бы
             ломать раскладку соседей ради промежуточного состояния. */
          transform:
            shift === null || shift.offsetPx === 0 ? undefined : `translateX(${shift.offsetPx}px)`,
        };

  /* Полоса «весь день» едет тем же сдвигом, но в своей ячейке сетки:
     перевесить её в чужие колонки посреди жеста значило бы пересчитать
     раскладку соседних полос ради промежуточного состояния. */
  const barStyle =
    variant === 'slot' || shift === null || shift.offsetPx === 0
      ? undefined
      : { transform: `translateX(${shift.offsetPx}px)` };

  const person = item.person;

  const body = (
    <>
      <button
        className={classes}
        ref={buttonRef}
        style={barStyle}
        type="button"
        onClick={onClick}
        onPointerDown={canDrag ? (event) => startDrag(event, 'move') : undefined}
        onPointerMove={canDrag ? onMove : undefined}
        onPointerUp={canDrag ? endDrag : undefined}
        onPointerCancel={canDrag ? endDrag : undefined}
        aria-label={item.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        /* 🔴 В сетке размер записи и есть её содержание: прямоугольник
           означает начало, длительность и пересечение с соседней. Полуторачасовое
           дело в неделе на телефоне выходит 14×42 — растянуть его до 44×44 значит
           не поднять цель, а соврать про время (ADR-236, issue #374).

           Исключение WCAG 2.5.8 «Essential» и с запасным путём: в виде дня та же
           запись занимает всю ширину колонки, а переход туда — заголовок дня,
           поднятый до тап-зоны этой же правкой.

           Полоса «весь день» и клетка месяца оговорки не имеют: там высота
           строки ничего не означает, и её поднимает обычное правило. */
        data-tap-size={variant === 'slot' ? 'essential' : undefined}
      >
        <span className={styles.head} aria-hidden="true">
          <Icon className={styles.icon} name={item.icon} size={12} />
          {/* 🔴 У записи «весь день» часа нет (BUGS, аудит 30 августа). Заявка
              несёт момент обращения, и показанный в полосе «Весь день» он
              читается как договорённость, которой не было; закрытые сутки
              часа не имеют вовсе. Время остаётся в подписи и в карточке —
              там видно, что это за момент. */}
          {item.allDay ? null : (
            <span className={styles.time}>
              {shift === null ? item.time : timeOfMinutes(shift.fromMin)}
            </span>
          )}
          {item.number === null ? null : (
            <span className={styles.number}>{`№ ${item.number}`}</span>
          )}
          {/* Инициалы рядом с краской: цвет не может быть единственным
              признаком человека — при дальтонизме от него ничего не остаётся. */}
          {person === null ? null : <span className={styles.who}>{person.initials}</span>}
        </span>

        {/* 🔴 Обрезанное имя раскрывается, а не остаётся огрызком (BUGS,
            аудит 30 августа). Подсказка — для мыши, карточка записи по
            нажатию — для клавиатуры и пальца: подсказка при наведении не
            имеет права быть единственным путём к полному тексту. Атрибут
            стоит на самой обрезаемой строке, а не на кнопке: у кнопки уже
            есть `aria-label`, и второй текст читался бы дважды. */}
        <span className={styles.name} aria-hidden="true" title={item.title}>
          {item.title}
        </span>

        {item.note === null ? null : (
          <span className={styles.where} aria-hidden="true" title={item.note}>
            {item.note}
          </span>
        )}

        {/* Значок остаётся в любом обличье, слово — только там, где для него
            есть место: в строке месяца оно обрезалось бы на втором слоге и
            читалось как мусор. Целиком пометка стоит в подписи и в карточке. */}
        {item.clash ? (
          <span className={styles.clashMark} aria-hidden="true">
            <Icon name="danger" size={11} />
            <span className={styles.markWord}>{crmClashContent.mark}</span>
          </span>
        ) : null}

        {item.overtimeMin > 0 ? (
          <span className={styles.overtimeMark} aria-hidden="true">
            <Icon name="danger" size={11} />
            <span className={styles.markWord}>{texts.overtime}</span>
          </span>
        ) : null}
      </button>

      {/* Края тянутся мышью; с клавиатуры длительность задаётся полем в форме
          правки — ускоритель не может быть единственным путём (CRM §3.5.1). */}
      {canDrag && !sideOnly && variant === 'slot' ? (
        <>
          <span
            className={`${styles.edge} ${styles.edgeStart}`}
            aria-hidden="true"
            onPointerDown={(event) => startDrag(event, 'start')}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          <span
            className={`${styles.edge} ${styles.edgeEnd}`}
            aria-hidden="true"
            onPointerDown={(event) => startDrag(event, 'end')}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </>
      ) : null}
    </>
  );

  const card =
    open && typeof document !== 'undefined'
      ? createPortal(
          <EventPopover
            item={item}
            anchor={anchor}
            onClose={hide}
            onEdit={() => {
              setOpen(false);
              if (edit !== null) actions.edit(edit);
            }}
            onRemove={() => {
              setOpen(false);
              if (edit !== null) actions.remove(edit);
            }}
            pending={actions.pending === item.id}
          />,
          document.body,
        )
      : null;

  if (variant !== 'slot') {
    return (
      <>
        {body}
        {card}
      </>
    );
  }

  return (
    <>
      <span className={styles.slot} style={slotStyle}>
        {body}
      </span>
      {card}
    </>
  );
}
