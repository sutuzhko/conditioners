'use client';

import { Fragment, useRef, type MouseEvent, type PointerEvent } from 'react';

import { savingsContent as t } from './content';
import { isNightHour } from './lib';
import { HOURS_IN_DAY } from './model';
import styles from './HoursGrid.module.css';

/** Метки рядов и делений шкалы стоят на каждом шестом часе: 00, 06, 12, 18. */
const MARK_STEP = 6;

/** Часы суток по порядку: 0…23. */
const DAY_HOURS = [...Array(HOURS_IN_DAY).keys()];

/** Деления шкалы под сеткой: 00, 06, 12, 18 и правый край суток. */
const SCALE_MARKS = DAY_HOURS.filter((hour) => hour % MARK_STEP === 0);

/** Атрибут с часом на ячейке: по нему протяжка узнаёт, над чем идёт курсор. */
const HOUR_ATTR = 'data-hour';

/**
 * Метка ряда. Половины суток (00 и 12) остаются видны и в раскладке на два
 * ряда, четверти (06 и 18) — только когда рядов четыре.
 */
function markClass(hour: number): string {
  return [styles.mark, hour % (MARK_STEP * 2) === 0 ? styles.markHalf : null]
    .filter(Boolean)
    .join(' ');
}

/** Час ячейки, если элемент ею и является (или лежит внутри неё). */
function hourOf(element: Element | null | undefined): number | null {
  const cell = element?.closest?.(`[${HOUR_ATTR}]`);
  const raw = cell?.getAttribute(HOUR_ATTR);
  if (raw === undefined || raw === null) return null;

  const hour = Number(raw);
  return Number.isInteger(hour) ? hour : null;
}

/**
 * Час ячейки под указателем.
 *
 * Пока захвата нет, событие приходит от самой ячейки. После `setPointerCapture`
 * его целью становится контейнер, и ячейку приходится искать по координатам —
 * иначе протяжка знала бы только про ту клетку, где начался жест.
 */
function hourUnder(event: PointerEvent<Element>): number | null {
  const fromTarget = hourOf(event.target instanceof Element ? event.target : null);
  if (fromTarget !== null) return fromTarget;

  if (typeof document.elementFromPoint !== 'function') return null;
  return hourOf(document.elementFromPoint(event.clientX, event.clientY));
}

export type HoursGridProps = {
  /** Отметки по часам суток: `hours[3]` — работает ли кондиционер с 03:00. */
  readonly hours: readonly boolean[];
  /** Переключение одной ячейки. Состояние живёт выше — в расчёте. */
  readonly onChange: (hour: number, next: boolean) => void;
  /** Заголовок сетки: он же подпись группы для скринридера. */
  readonly labelId: string;
};

/**
 * Сетка суток по часам: пользователь отмечает, когда кондиционер работает.
 *
 * 🔴 Каждая ячейка — настоящая кнопка с `aria-pressed`, а не раскрашенный
 * `div`: протяжка мышью недоступна ни с клавиатуры, ни голосом, и она здесь
 * ускорение для мыши, а не единственный способ отметить час. Клик и пробел с
 * Enter работают всегда, в том числе на сенсорном экране.
 *
 * 🔴 Протяжка держится на захвате указателя контейнером, а не на слушателях
 * окна. Прежняя версия ждала `pointerup` на `window` — и не получала его,
 * если кнопку отпускали за пределами окна браузера или жест забирал себе сам
 * браузер. Краска оставалась включённой, и дальше ячейки перекрашивались от
 * одного наведения. С захватом события приходят контейнеру всегда, а
 * `event.buttons` служит второй проверкой: кнопка не зажата — протяжки нет.
 */
export function HoursGrid({ hours, onChange, labelId }: HoursGridProps) {
  /**
   * Чем красит текущая протяжка — включает или выключает; `null` — протяжки
   * нет. Ref, а не state: перерисовка на смену этого значения не нужна.
   */
  const paint = useRef<boolean | null>(null);

  /** Час, обработанный последним: без него сосед красится на каждом движении. */
  const lastHour = useRef<number | null>(null);

  const stopPainting = () => {
    paint.current = null;
    lastHour.current = null;
  };

  const paintHour = (hour: number) => {
    const next = paint.current;
    if (next === null || lastHour.current === hour) return;

    lastHour.current = hour;
    if (hours[hour] !== next) onChange(hour, next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // протяжка — жест основной кнопки; правая кнопка открывает меню браузера
    if (!event.isPrimary || event.button !== 0) return;

    const hour = hourUnder(event);
    if (hour === null) return;

    /* Захват указателя контейнером: события идут сюда, даже если курсор
       ушёл за пределы сетки и окна. Заодно снимается неявный захват
       сенсорным указателем, из-за которого палец «прилипал» к первой
       ячейке. */
    const grid = event.currentTarget;
    if (typeof grid.setPointerCapture === 'function') {
      grid.setPointerCapture(event.pointerId);
    }

    // гасим выделение текста и нативное перетаскивание под курсором
    event.preventDefault();

    paint.current = hours[hour] !== true;
    lastHour.current = hour;
    onChange(hour, paint.current);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (paint.current === null) return;

    /* Кнопку отпустили там, где события до нас не дошли, — заканчиваем
       протяжку по факту, а не по обещанию браузера прислать `pointerup`. */
    if (event.buttons === 0) {
      stopPainting();
      return;
    }

    const hour = hourUnder(event);
    if (hour !== null) paintHour(hour);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>, hour: number) => {
    /* Указателем ячейку уже переключил `pointerdown` — иначе протяжка не
       началась бы, — и клик обязан ту же ячейку пропустить, чтобы она не
       вернулась обратно. Пропускаем по detail: у клавиатуры он равен нулю,
       потому что пробел и Enter доходят сюда синтетическим кликом. */
    if (event.detail !== 0) return;
    onChange(hour, hours[hour] !== true);
  };

  return (
    <>
      <div
        className={styles.grid}
        role="group"
        aria-labelledby={labelId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPainting}
        onPointerCancel={stopPainting}
        onLostPointerCapture={stopPainting}
      >
        {DAY_HOURS.map((hour) => {
          const on = hours[hour] === true;
          const night = isNightHour(hour);
          const name = t.hourCell(hour, on, night);
          const cellClass = [styles.cell, on ? styles.on : null, night ? styles.night : null]
            .filter(Boolean)
            .join(' ');

          return (
            <Fragment key={hour}>
              {hour % MARK_STEP === 0 ? (
                /* Метка ряда: на узком экране сутки складываются в несколько
                   рядов, и без неё непонятно, какой из них какой. В широкой
                   раскладке ряд один — метки скрыты, работает шкала снизу. */
                <span className={markClass(hour)} aria-hidden="true">
                  {t.hourMark(hour)}
                </span>
              ) : null}
              <button
                type="button"
                className={cellClass}
                aria-pressed={on}
                aria-label={name}
                title={name}
                data-hour={hour}
                onClick={(event) => handleClick(event, hour)}
              />
            </Fragment>
          );
        })}
      </div>

      {/* Шкала под сеткой имеет смысл только когда сутки лежат одним рядом. */}
      <p className={styles.scale} aria-hidden="true">
        {SCALE_MARKS.map((hour) => (
          <span key={hour}>{t.hourMark(hour)}</span>
        ))}
        <span>{t.gridScaleEnd}</span>
      </p>
    </>
  );
}
