'use client';

import { Fragment, type MouseEvent, type PointerEvent, useEffect, useRef } from 'react';

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

/**
 * Метка ряда. Половины суток (00 и 12) остаются видны и в раскладке на два
 * ряда, четверти (06 и 18) — только когда рядов четыре.
 */
function markClass(hour: number): string {
  return [styles.mark, hour % (MARK_STEP * 2) === 0 ? styles.markHalf : null]
    .filter(Boolean)
    .join(' ');
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
 */
export function HoursGrid({ hours, onChange, labelId }: HoursGridProps) {
  /**
   * Чем красит текущая протяжка — включает или выключает; `null` — протяжки
   * нет. Ref, а не state: перерисовка на смену этого значения не нужна.
   */
  const paint = useRef<boolean | null>(null);

  /* Указатель могут отпустить где угодно — за пределами сетки и вообще за
     окном, — поэтому слушаем window. Снимаем при размонтировании: иначе
     обработчик переживёт компонент.

     🔴 Именно `pointerup`, а не `mouseup`: в `pointerdown` ниже стоит
     `preventDefault`, а он гасит совместимостные мышиные события. С `mouseup`
     протяжка не заканчивалась никогда — после клика ячейки продолжали
     краситься от одного наведения.

     `pointercancel` обязателен для сенсорного экрана: когда браузер решает,
     что жест был прокруткой страницы, он забирает указатель себе и `pointerup`
     не присылает. */
  useEffect(() => {
    const stopPainting = () => {
      paint.current = null;
    };

    window.addEventListener('pointerup', stopPainting);
    window.addEventListener('pointercancel', stopPainting);
    return () => {
      window.removeEventListener('pointerup', stopPainting);
      window.removeEventListener('pointercancel', stopPainting);
    };
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, hour: number) => {
    /* Сенсорный указатель по умолчанию закрепляется за элементом, на котором
       нажали, и `pointerenter` у соседних ячеек не срабатывает. Отпускаем
       захват — палец начинает вести себя как мышь. Прокрутку страницы это не
       ломает: вертикальный жест остаётся за браузером (`touch-action: pan-y`),
       и он присылает `pointercancel`. */
    const cell = event.currentTarget;
    if (typeof cell.hasPointerCapture === 'function' && cell.hasPointerCapture(event.pointerId)) {
      cell.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();
    const next = hours[hour] !== true;
    paint.current = next;
    onChange(hour, next);
  };

  const handlePointerEnter = (hour: number) => {
    const next = paint.current;
    if (next === null || hours[hour] === next) return;
    onChange(hour, next);
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
      <div className={styles.grid} role="group" aria-labelledby={labelId}>
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
                onPointerDown={(event) => handlePointerDown(event, hour)}
                onPointerEnter={() => handlePointerEnter(hour)}
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
