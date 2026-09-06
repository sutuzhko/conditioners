'use client';

import { useState } from 'react';

import { Icon } from '@/shared/ui';

import { crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { allDayBands, type ScheduleColumn } from './schedule';
import styles from './AllDayBar.module.css';

export interface AllDayBarProps {
  /**
   * Колонки вида — те же, что у шапки и у сетки часов. 🔴 Полоса обязана
   * стоять в тех же колонках: заявка, съехавшая на соседний день, — это
   * неправда о том, когда человек обратился.
   */
  readonly columns: readonly ScheduleColumn[];
  /**
   * Найденная поиском запись — её подсвечивают, чтобы глаз нашёл её в сетке
   * (issue #132). Признак идёт с адреса и передаётся вниз пропом: чип не
   * должен знать про маршрутизацию.
   */
  readonly focusId?: string | undefined;
}

/** Сколько строк видно, пока полоса свёрнута. */
const COLLAPSED_ROWS = 2;

/**
 * Полоса «весь день» над сеткой часов — CRM §3.5.1.
 *
 * 🔴 Заявка с сайта живёт здесь, пока ей не назначили время (ADR-128): она
 * пришла, а не была запланирована на час, и место в сетке занимать не должна.
 * Сюда же уходят заметки «не забыть» и дни, закрытые целиком.
 *
 * 🔴 Многодневная отлучка идёт одной полосой через колонки, а не повторяется в
 * каждой (ADR-165): отпуск на две недели — одна запись, и четырнадцать раз
 * подряд написанное «Отпуск» читается как четырнадцать разных отлучек.
 * Раскладку полос считает `allDayBands`, разметке остаётся поставить их по
 * колонкам сетки.
 *
 * Полоса растёт и сворачивается: день с восемью заявками не имеет права
 * съесть сетку часов, ради которой календарь и открывают.
 */
export function AllDayBar({ columns, focusId }: AllDayBarProps) {
  const [open, setOpen] = useState(false);

  const bands = allDayBands(columns);
  const rows = bands.reduce((max, band) => Math.max(max, band.lane + 1), 0);
  const hidden = Math.max(rows - COLLAPSED_ROWS, 0);
  const collapsed = hidden > 0 && !open;

  return (
    <div className={styles.bar}>
      <div className={styles.rail}>
        <span className={styles.label} aria-hidden="true">
          {texts.allDay}
        </span>

        {hidden === 0 ? null : (
          /* Кнопка живёт в полосе часов, а не в колонке дня: колонка отдана
             записям, и переключатель отбирал бы у них ширину. */
          <button
            className={styles.toggle}
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={open ? texts.close : texts.moreEvents(hidden)}
            title={open ? texts.close : texts.moreEvents(hidden)}
          >
            {open ? (
              <Icon name="arrow-right" className={styles.up} size={12} />
            ) : (
              <span className={styles.count}>{`+${hidden}`}</span>
            )}
          </button>
        )}
      </div>

      {/* Список, а не набор кнопок: у полосы должно быть имя и счёт —
          скринридер объявляет «список из двух». */}
      <ul
        className={[styles.lanes, collapsed ? styles.collapsed : null].filter(Boolean).join(' ')}
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        aria-label={texts.allDay}
      >
        {bands.map((band) => (
          <li
            className={[
              styles.item,
              band.clippedStart ? styles.fromEarlier : null,
              band.clippedEnd ? styles.toLater : null,
            ]
              .filter(Boolean)
              .join(' ')}
            key={band.key}
            style={{
              gridColumn: `${band.from + 1} / span ${band.span}`,
              gridRow: band.lane + 1,
            }}
          >
            <EventChip item={band.item} variant="bar" focused={band.item.id === focusId} />
          </li>
        ))}
      </ul>
    </div>
  );
}
