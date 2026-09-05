import Link from 'next/link';

import { CRM_PATH, crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { monthRows, type ScheduleColumn } from './schedule';
import styles from './Agenda.module.css';

export interface AgendaProps {
  /** Дни промежутка — те же колонки, что и у часовой сетки. */
  readonly columns: readonly ScheduleColumn[];
  /** Подпись области: у неё роль, и называться она обязана словами. */
  readonly label?: string | undefined;
  /**
   * Найденная поиском запись — её подсвечивают, чтобы глаз нашёл её в списке
   * (issue #132). Признак идёт с адреса и передаётся вниз пропом.
   */
  readonly focusId?: string | undefined;
}

/**
 * Повестка: неделя списком дел по дням — issue #47, [CRM §3.5.1](../../../../docs/CRM.md).
 *
 * 🔴 Семь колонок в 375 пикселях дают сорок на день, и от названия записи
 * остаётся один символ: «Ф…», «Ку…», «П…». Эталон (Apple Calendar) недели на
 * телефоне не показывает вовсе — там список. А телефон у монтажника как раз в
 * кармане, и открывают календарь именно в нём.
 *
 * Порядок внутри дня тот же, что в клетке месяца: сначала записи без часа,
 * дальше по времени. Пустые дни не показываются — повестка отвечает на вопрос
 * «что на этой неделе», а не «сколько в ней дней».
 *
 * Серверный компонент: список приходит готовым, интерактивна только запись.
 */
export function Agenda({ columns, label = texts.agendaLabel, focusId }: AgendaProps) {
  const days = columns
    .map((column) => ({ column, items: monthRows(column) }))
    .filter((day) => day.items.length > 0);

  if (days.length === 0) {
    return (
      <section className={styles.agenda} aria-label={label}>
        <p className={styles.emptyTitle}>{texts.agendaEmpty}</p>
        <p className={styles.emptyText}>{texts.agendaEmptyHint}</p>
      </section>
    );
  }

  return (
    <section className={styles.agenda} aria-label={label}>
      <ol className={styles.days}>
        {days.map(({ column, items }) => (
          <li className={styles.day} key={column.key}>
            <Link
              className={[styles.head, column.today ? styles.today : null]
                .filter(Boolean)
                .join(' ')}
              href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
              aria-label={texts.openDay(column.label)}
              prefetch={false}
            >
              <span className={styles.weekday} aria-hidden="true">
                {column.weekday}
              </span>
              <span className={styles.date} aria-hidden="true">
                {column.date}
              </span>
              <span className={styles.count} aria-hidden="true">
                {texts.records(items.length)}
              </span>
            </Link>

            <ul className={styles.items}>
              {items.map((item) => (
                <li className={styles.item} key={item.id}>
                  <EventChip item={item} variant="bar" focused={item.id === focusId} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
