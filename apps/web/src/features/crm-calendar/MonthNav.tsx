import Link from 'next/link';

import { type DayKey, type MonthKey, shiftMonth } from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { crmContent as texts, monthTitle } from './content';
import styles from './MonthNav.module.css';

export interface MonthNavProps {
  readonly month: MonthKey;
  readonly today: DayKey;
  /** Сколько дел просрочено — цифра рядом с месяцем, а не в глубине списка. */
  readonly overdue: number;
}

/**
 * Заголовок календаря: месяц и переходы.
 *
 * Переходы — ссылки, а не кнопки: месяц обязан читаться из адреса, иначе
 * обновление страницы возвращает владельца в текущий и теряет то, что он
 * смотрел.
 */
export function MonthNav({ month, today, overdue }: MonthNavProps) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className={styles.nav}>
      <h2 className={styles.title}>{monthTitle(month)}</h2>

      {overdue === 0 ? null : (
        <Link className={styles.overdue} href={{ pathname: '/admin/crm', query: { day: today } }}>
          {texts.overdue(overdue)}
        </Link>
      )}

      <div className={styles.buttons}>
        <Link
          className={styles.step}
          href={{ pathname: '/admin/crm', query: { month: prev } }}
          aria-label={texts.prevMonth}
        >
          <Icon name="arrow-right" className={styles.back} />
        </Link>

        <Link className={styles.today} href={{ pathname: '/admin/crm', query: { day: today } }}>
          {texts.today}
        </Link>

        <Link
          className={styles.step}
          href={{ pathname: '/admin/crm', query: { month: next } }}
          aria-label={texts.nextMonth}
        >
          <Icon name="arrow-right" />
        </Link>
      </div>
    </div>
  );
}
