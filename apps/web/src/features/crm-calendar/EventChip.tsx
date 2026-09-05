'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import type { PersonTone } from '@/entities/crm/lib/palette';
import { crmClashContent } from '@/entities/crm/content';
import { Icon } from '@/shared/ui';

import { useCalendarActions } from './actions';
import { capturePointer, releasePointer } from './pointer';
import { crmContent as texts } from './content';
import { EventPopover } from './EventPopover';
import { DURATION_STEP_MIN, MIN_EVENT_MIN } from './model';
import type { ScheduleItem } from './schedule';
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

/** Сколько держится подсветка находки. */
const FOUND_MS = 5000;

/** Ниже этого сдвига движение считается кликом, а не перетаскиванием. */
const DRAG_THRESHOLD_PX = 4;

type Drag = {
  readonly mode: 'move' | 'start' | 'end';
  readonly startY: number;
  readonly fromMin: number;
  readonly toMin: number;
  readonly perPx: number;
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
  const [shift, setShift] = useState<{ readonly fromMin: number; readonly toMin: number } | null>(
    null,
  );

  const edit = item.edit;
  const canDrag = draggable && edit !== null && edit.kind === 'event';

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

    /* Сетка меряется своей полосой: она покрывает ровно сутки, поэтому
       минута в пикселях выводится из её высоты и не требует общей с CSS
       константы — та разошлась бы с модулем на первой правке высоты часа. */
    const track = buttonRef.current?.closest('[data-track]');
    if (!(track instanceof HTMLElement)) return;

    const height = track.getBoundingClientRect().height;
    if (height <= 0) return;

    event.stopPropagation();
    capturePointer(event.currentTarget, event.pointerId);

    movedRef.current = false;
    dragRef.current = {
      mode,
      startY: event.clientY,
      fromMin: item.fromMin,
      toMin: item.toMin,
      perPx: MINUTES_IN_DAY / height,
    };
  };

  const onMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null) return;

    const deltaPx = event.clientY - drag.startY;
    if (!movedRef.current && Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return;

    movedRef.current = true;
    const delta = snap(deltaPx * drag.perPx);

    if (drag.mode === 'move') {
      const length = drag.toMin - drag.fromMin;
      const from = Math.min(Math.max(drag.fromMin + delta, 0), MINUTES_IN_DAY - length);
      setShift({ fromMin: from, toMin: from + length });
      return;
    }

    if (drag.mode === 'start') {
      const from = Math.min(Math.max(drag.fromMin + delta, 0), drag.toMin - MIN_EVENT_MIN);
      setShift({ fromMin: from, toMin: drag.toMin });
      return;
    }

    const to = Math.min(Math.max(drag.toMin + delta, drag.fromMin + MIN_EVENT_MIN), MINUTES_IN_DAY);
    setShift({ fromMin: drag.fromMin, toMin: to });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag === null) return;

    releasePointer(event.currentTarget, event.pointerId);

    const next = shift;
    setShift(null);
    if (!movedRef.current || next === null || edit === null || edit.kind !== 'event') return;

    actions.move(edit.id, {
      ...edit.draft,
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
    item.person === null ? styles[item.tone] : PERSON_CLASS[item.person.tone],
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
          zIndex: place.depth + 1,
        };

  const person = item.person;

  const body = (
    <>
      <button
        className={classes}
        ref={buttonRef}
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
      {canDrag && variant === 'slot' ? (
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
