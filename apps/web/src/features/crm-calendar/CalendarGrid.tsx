import Link from 'next/link';

import { CRM_PATH, WEEKDAYS, crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { monthRows, type ScheduleColumn } from './schedule';
import styles from './CalendarGrid.module.css';

/** Сколько записей помещается в клетку до того, как остаток свернётся в «Ещё N». */
const VISIBLE = 3;

export interface CalendarGridProps {
  /** Сорок две клетки месячной сетки. Собирает их `monthColumns`. */
  readonly columns: readonly ScheduleColumn[];
  /** Подпись сетки: у неё роль области, и называться она обязана словами. */
  readonly label?: string | undefined;
}

/**
 * Месяц — обзор, а не планировщик (ADR-128).
 *
 * 🔴 Часовой сетки здесь нет намеренно: в клетке высотой в сотню точек
 * честного времени не нарисовать, а нечестное хуже отсутствующего. Зато время
 * показывается всегда — строкой «цветная точка · время · название». Капсулы с
 * инициалами, из которых не следует, когда человек занят, владелец забраковал
 * прямо.
 *
 * Серверный компонент: клетки приходят готовыми, интерактивна только запись.
 */
export function CalendarGrid({ columns, label = texts.gridLabel }: CalendarGridProps) {
  return (
    <section className={styles.grid} aria-label={label}>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((title) => (
          <span className={styles.weekday} key={title}>
            {title}
          </span>
        ))}
      </div>

      <div className={styles.days}>
        {columns.map((column) => {
          const rows = monthRows(column);
          const shown = rows.slice(0, VISIBLE);
          const rest = rows.length - shown.length;

          return (
            /* Клетка — не ссылка: внутри неё лежат записи, а ссылка внутри
               ссылки недопустима. Переход в день даёт число дня и «Ещё N». */
            <div
              className={[
                styles.cell,
                column.outside ? styles.outside : null,
                column.today ? styles.today : null,
              ]
                .filter(Boolean)
                .join(' ')}
              key={column.key}
            >
              <Link
                className={styles.number}
                href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
                aria-label={texts.openDay(column.label)}
                prefetch={false}
              >
                {column.date}
              </Link>

              {rows.length === 0 ? null : (
                <ul className={styles.rows}>
                  {shown.map((item) => (
                    <li className={styles.row} key={item.id}>
                      <EventChip item={item} variant="row" />
                    </li>
                  ))}
                </ul>
              )}

              {rest > 0 ? (
                <Link
                  className={styles.more}
                  href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
                  prefetch={false}
                >
                  {texts.moreEvents(rest)}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
