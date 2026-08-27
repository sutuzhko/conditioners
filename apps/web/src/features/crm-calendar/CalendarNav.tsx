import Link from 'next/link';

import { formatDate } from '@/shared/lib/format';
import {
  type DayKey,
  type MonthKey,
  monthOfDay,
  shiftDay,
  shiftMonth,
  shiftWeek,
  weekGrid,
} from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { CalendarCreate } from './CalendarCreate';
import { CRM_PATH, VIEW_TITLE, crmContent as texts, monthTitle, weekTitle } from './content';
import { CALENDAR_VIEWS, type CalendarView } from './model';
import styles from './CalendarNav.module.css';

export interface CalendarNavProps {
  readonly view: CalendarView;
  readonly month: MonthKey;
  readonly day: DayKey;
  readonly today: DayKey;
  /** Сколько дел просрочено — цифра рядом с заголовком, а не в глубине списка. */
  readonly overdue: number;
  /** Включено ли наложение занятости команды (ADR-123). */
  readonly team?: boolean | undefined;
  /**
   * 🔴 Показывать ли сам переключатель. У монтажника его нет: чужая занятость
   * ему не видна (ADR-095), и кнопка, ничего не меняющая, только обманывает.
   */
  readonly canTeam?: boolean | undefined;
}

/** Наложение занятости остаётся включённым при любом переходе внутри раздела. */
const TEAM_ON = 'on';

function withTeam(query: Record<string, string>, team: boolean): Record<string, string> {
  return team ? { ...query, team: TEAM_ON } : query;
}

/** Шаг листания зависит от вида: месяц листается месяцами, неделя — неделями. */
function stepOf(view: CalendarView, day: DayKey, month: MonthKey, delta: number) {
  if (view === 'month') {
    const next = shiftMonth(month, delta);
    return { query: { view, month: next }, label: delta < 0 ? texts.prevMonth : texts.nextMonth };
  }

  if (view === 'week') {
    const next = shiftWeek(day, delta);
    return { query: { view, day: next }, label: delta < 0 ? texts.prevWeek : texts.nextWeek };
  }

  const next = shiftDay(day, delta);
  return { query: { view, day: next }, label: delta < 0 ? texts.prevDay : texts.nextDay };
}

/** Заголовок называет ровно то, что показано: месяц, неделю или день. */
function titleOf(view: CalendarView, day: DayKey, month: MonthKey): string {
  if (view === 'month') return monthTitle(month);

  if (view === 'week') {
    const week = weekGrid(day);
    return weekTitle(week[0]?.key ?? day, week[week.length - 1]?.key ?? day);
  }

  return formatDate(`${day}T00:00:00.000Z`);
}

/**
 * Шапка календаря: что показано, чем листается, в каком виде и чем пополняется.
 *
 * Порядок — как в эталоне (CRM §3.5.1): стрелки и «Сегодня» слева, вид
 * посередине, «+» справа.
 *
 * 🔴 Вид, месяц и день живут в адресе (`?view=week&day=2026-08-24`), поэтому
 * переходы — ссылки, а не состояние на клиенте: открытый экран переживает
 * обновление страницы, возвращается из закладок и пересылается мастеру
 * (ADR-080). Параметры по-английски — инвариант 17.
 */
export function CalendarNav({
  view,
  month,
  day,
  today,
  overdue,
  team = false,
  canTeam = false,
}: CalendarNavProps) {
  const back = stepOf(view, day, month, -1);
  const forward = stepOf(view, day, month, 1);
  const here = view === 'month' ? { view, month } : { view, day };

  return (
    <div className={styles.nav}>
      <div className={styles.steps}>
        <Link
          className={styles.step}
          href={{ pathname: CRM_PATH, query: withTeam(back.query, team) }}
          aria-label={back.label}
        >
          <Icon name="arrow-right" className={styles.back} />
        </Link>

        <Link
          className={styles.today}
          href={{
            pathname: CRM_PATH,
            query: withTeam(
              view === 'month' ? { view, month: monthOfDay(today) } : { view, day: today },
              team,
            ),
          }}
        >
          {texts.today}
        </Link>

        <Link
          className={styles.step}
          href={{ pathname: CRM_PATH, query: withTeam(forward.query, team) }}
          aria-label={forward.label}
        >
          <Icon name="arrow-right" />
        </Link>
      </div>

      <h2 className={styles.title}>{titleOf(view, day, month)}</h2>

      {overdue === 0 ? null : (
        <Link
          className={styles.overdue}
          href={{ pathname: CRM_PATH, query: { view: 'day', day: today } }}
        >
          {texts.overdue(overdue)}
        </Link>
      )}

      <nav className={styles.views} aria-label={texts.viewLabel}>
        {CALENDAR_VIEWS.map((entry) => (
          <Link
            className={[styles.view, entry === view ? styles.viewCurrent : null]
              .filter(Boolean)
              .join(' ')}
            key={entry}
            href={{
              pathname: CRM_PATH,
              // месяц и день переносятся между видами: смена вида не меняет дату
              query: withTeam(
                entry === 'month' ? { view: entry, month } : { view: entry, day },
                team,
              ),
            }}
            aria-current={entry === view ? 'page' : undefined}
          >
            {VIEW_TITLE[entry]}
          </Link>
        ))}
      </nav>

      {canTeam ? (
        /* 🔴 Переключатель, а не фильтр «чей календарь»: занятость всей
           команды ложится на одну сетку разом — владелец назначает наряд,
           глядя на всех, а не перебирая людей по очереди (ADR-123). */
        <Link
          className={[styles.team, team ? styles.teamOn : null].filter(Boolean).join(' ')}
          href={{ pathname: CRM_PATH, query: withTeam(here, !team) }}
          aria-pressed={team}
          title={team ? texts.teamOff : texts.teamOn}
        >
          <Icon name="pulse" className={styles.teamIcon} />
          {texts.team}
        </Link>
      ) : null}

      <div className={styles.actions}>
        <CalendarCreate day={day} canBlock />
      </div>
    </div>
  );
}
