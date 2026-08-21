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

  /**
   * Тип последнего указателя. Мышь переключает ячейку уже в `pointerdown` —
   * иначе протяжка не начнётся, — и следующий за ним `click` обязан эту же
   * ячейку пропустить, чтобы она не вернулась обратно.
   */
  const pointer = useRef('');

  /* Кнопку могут отпустить где угодно, в том числе за пределами сетки и
     вообще за окном, поэтому слушаем window. Снимаем при размонтировании —
     иначе обработчик переживёт компонент. */
  useEffect(() => {
    const stopPainting = () => {
      paint.current = null;
    };

    window.addEventListener('mouseup', stopPainting);
    return () => {
      window.removeEventListener('mouseup', stopPainting);
    };
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, hour: number) => {
    pointer.current = event.pointerType;

    /* На сенсорном экране протяжки нет: перехватив здесь нажатие, мы отобрали
       бы у страницы прокрутку пальцем. Там ячейку переключает обычный клик. */
    if (event.pointerType !== 'mouse') return;

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
    /* detail === 0 — активация с клавиатуры: пробел и Enter доходят сюда
       синтетическим кликом, и их пропускать нельзя. */
    if (event.detail !== 0 && pointer.current === 'mouse') return;
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
