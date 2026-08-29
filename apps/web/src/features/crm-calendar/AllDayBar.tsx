'use client';

import { useState } from 'react';

import { Icon } from '@/shared/ui';

import { crmContent as texts } from './content';
import { EventChip } from './EventChip';
import type { ScheduleItem } from './schedule';
import styles from './AllDayBar.module.css';

/** Колонка полосы: день и его записи без времени. */
export type AllDayColumn = {
  readonly key: string;
  readonly items: readonly ScheduleItem[];
};

export interface AllDayBarProps {
  readonly columns: readonly AllDayColumn[];
  /**
   * Раскладка колонок — та же строка, что у шапки и у сетки часов. 🔴 Полоса
   * обязана стоять в тех же колонках: заявка, съехавшая на соседний день, —
   * это неправда о том, когда человек обратился.
   */
  readonly template: string;
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
 * Полоса растёт и сворачивается: день с восемью заявками не имеет права
 * съесть сетку часов, ради которой календарь и открывают.
 */
export function AllDayBar({ columns, template, focusId }: AllDayBarProps) {
  const [open, setOpen] = useState(false);

  const rows = columns.reduce((max, column) => Math.max(max, column.items.length), 0);
  const hidden = Math.max(rows - COLLAPSED_ROWS, 0);
  const collapsed = hidden > 0 && !open;

  return (
    <div className={styles.bar} style={{ gridTemplateColumns: template }}>
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

      {columns.map((column) => (
        /* Список, а не набор кнопок: у полосы должно быть имя и счёт —
           скринридер объявляет «список из двух». */
        <ul
          className={[styles.list, collapsed ? styles.collapsed : null].filter(Boolean).join(' ')}
          key={column.key}
          aria-label={texts.allDay}
        >
          {column.items.map((item) => (
            <li className={styles.item} key={item.id}>
              <EventChip item={item} variant="bar" focused={item.id === focusId} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
