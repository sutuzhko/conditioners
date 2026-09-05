import Link from 'next/link';

import { formatDate } from '@/shared/lib/format';
import { type DayKey, type MonthKey, weekGrid } from '@/shared/lib/calendar';
import { Icon } from '@/shared/ui';

import { CalendarCreate } from './CalendarCreate';
import { CalendarKeyboard } from './CalendarKeyboard';
import { CalendarSearch } from './CalendarSearch';
import { stepQuery, todayQuery, viewQuery, type CalendarPlace } from './navigation';
import {
  CRM_PATH,
  VIEW_TITLE,
  crmContent as texts,
  monthTitle,
  weekTitle,
  windowTitle,
} from './content';
import { CALENDAR_VIEWS, type CalendarView, type ScheduleKind } from './model';
import { DEFAULT_WORK_WINDOW } from './schedule';
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
   * Состав слоя: кого видно и оставлена ли на сетке одна занятость (issue
   * #49). Шапка их не меняет, но обязана донести до листания и смены вида —
   * иначе следующая неделя открывается в другом составе.
   */
  readonly who?: readonly string[] | null | undefined;
  readonly kinds?: readonly ScheduleKind[] | null | undefined;
  /**
   * 🔴 Видит ли смотрящий команду. У монтажника чужая занятость закрыта
   * (ADR-095), и подзаголовок не называет ему её состав.
   */
  readonly canTeam?: boolean | undefined;
  /** Сколько монтажников в команде — вторая половина подзаголовка. */
  readonly teamSize?: number | undefined;
  /**
   * Рабочее окно из настройки `schedule` (ADR-138) — оно же в подзаголовке.
   * Не передали — умолчание настройки: истории и тесты в базу не ходят.
   */
  readonly workFromMin?: number | undefined;
  readonly workToMin?: number | undefined;
}

/* 🔴 Сами адреса собирает `navigation`: те же переходы делает клавиатура, и
   разойтись им нельзя — иначе одно и то же действие ведёт в два разных места.
   Здесь остаётся только подпись, которую слышит скринридер. */

/** Подпись шага зависит от вида: месяц листается месяцами, неделя — неделями. */
function stepLabel(view: CalendarView, delta: number): string {
  if (view === 'month') return delta < 0 ? texts.prevMonth : texts.nextMonth;
  if (view === 'week') return delta < 0 ? texts.prevWeek : texts.nextWeek;

  return delta < 0 ? texts.prevDay : texts.nextDay;
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
  who = null,
  kinds = null,
  canTeam = false,
  teamSize = 0,
  workFromMin = DEFAULT_WORK_WINDOW.fromMin,
  workToMin = DEFAULT_WORK_WINDOW.toMin,
}: CalendarNavProps) {
  const place: CalendarPlace = { view, month, day, today, team, who, kinds };
  const window = windowTitle(workFromMin, workToMin);

  return (
    <div className={styles.nav}>
      {/* 🔴 Заголовок раздела — сам период, а название раздела уходит строкой
          ниже (макет `design/admin/Calendar.body.html`, кадр 1440). Человек,
          открывший календарь, и так знает, куда пришёл; чего он не знает —
          какую неделю ему показали. */}
      <div className={styles.headline}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{titleOf(view, day, month)}</h1>
          <p className={styles.sub}>
            {canTeam ? texts.subtitle(teamSize, window) : texts.subtitleSolo(window)}
          </p>
        </div>

        <div className={styles.tools}>
          <nav className={styles.views} aria-label={texts.viewLabel}>
            {CALENDAR_VIEWS.map((entry) => (
              <Link
                className={[styles.view, entry === view ? styles.viewCurrent : null]
                  .filter(Boolean)
                  .join(' ')}
                key={entry}
                // месяц и день переносятся между видами: смена вида не меняет дату
                href={{ pathname: CRM_PATH, query: viewQuery(place, entry) }}
                aria-current={entry === view ? 'page' : undefined}
              >
                {VIEW_TITLE[entry]}
              </Link>
            ))}
          </nav>

          <CalendarCreate day={day} canBlock />
        </div>
      </div>

      {/* Вторая строка — листание и поиск: макет ставит стрелки и «Сегодня»
          слева, поиск прижимает вправо. */}
      <div className={styles.toolbar}>
        <div className={styles.steps}>
          <Link
            className={styles.step}
            href={{ pathname: CRM_PATH, query: stepQuery(place, -1) }}
            aria-label={stepLabel(view, -1)}
          >
            <Icon name="arrow-right" className={styles.back} />
          </Link>

          <Link
            className={styles.step}
            href={{ pathname: CRM_PATH, query: stepQuery(place, 1) }}
            aria-label={stepLabel(view, 1)}
          >
            <Icon name="arrow-right" />
          </Link>
        </div>

        <Link className={styles.today} href={{ pathname: CRM_PATH, query: todayQuery(place) }}>
          {texts.today}
        </Link>

        {overdue === 0 ? null : (
          <Link
            className={styles.overdue}
            href={{ pathname: CRM_PATH, query: { view: 'day', day: today } }}
          >
            {texts.overdue(overdue)}
          </Link>
        )}

        <CalendarKeyboard {...place} />

        <div className={styles.find}>
          <CalendarSearch team={team} />
        </div>
      </div>
    </div>
  );
}
