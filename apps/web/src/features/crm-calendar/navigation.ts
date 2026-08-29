/**
 * Адреса календаря — одни и те же для шапки и для клавиатуры.
 *
 * 🔴 Вид и период живут в адресе, а не в состоянии компонента ([CRM §3.5.1]
 * (../../../../docs/CRM.md), ADR-128). Поэтому и клавиша, и ссылка в шапке
 * обязаны собирать один и тот же адрес: разойдясь, они дали бы два разных
 * календаря на одно нажатие. Сборка вынесена сюда, чтобы расходиться было
 * нечему.
 */
import {
  type DayKey,
  type MonthKey,
  monthOfDay,
  shiftDay,
  shiftMonth,
  shiftWeek,
} from '@/shared/lib/calendar';

import { CRM_PATH } from './content';
import type { CalendarView } from './model';

export type CalendarQuery = Record<string, string>;

/** Где мы сейчас: этого хватает, чтобы собрать любой переход. */
export interface CalendarPlace {
  readonly view: CalendarView;
  readonly day: DayKey;
  readonly month: MonthKey;
  readonly today: DayKey;
  readonly team: boolean;
}

/** Наложение занятости остаётся включённым при любом переходе внутри раздела. */
const TEAM_ON = 'on';

export function withTeam(query: CalendarQuery, team: boolean): CalendarQuery {
  return team ? { ...query, team: TEAM_ON } : query;
}

/**
 * Куда ведёт шаг назад или вперёд. Шаг зависит от вида: месяц листается
 * месяцами, неделя — неделями, день — днями.
 */
export function stepQuery(place: CalendarPlace, delta: number): CalendarQuery {
  const { view, day, month, team } = place;

  if (view === 'month') return withTeam({ view, month: shiftMonth(month, delta) }, team);
  if (view === 'week') return withTeam({ view, day: shiftWeek(day, delta) }, team);

  return withTeam({ view, day: shiftDay(day, delta) }, team);
}

/** «Сегодня» в текущем виде: месяц прыгает на месяц сегодняшнего дня. */
export function todayQuery(place: CalendarPlace): CalendarQuery {
  const { view, today, team } = place;

  return withTeam(
    view === 'month' ? { view, month: monthOfDay(today) } : { view, day: today },
    team,
  );
}

/**
 * Смена вида. Дата при этом не меняется: человек смотрит ту же неделю
 * по-другому, а не прыгает в сегодня.
 */
export function viewQuery(place: CalendarPlace, next: CalendarView): CalendarQuery {
  const { day, month, team } = place;

  return withTeam(next === 'month' ? { view: next, month } : { view: next, day }, team);
}

/**
 * Адрес строкой — для `router.push`, который объекта маршрута не принимает.
 *
 * Тип сужен до формы адреса, а не оставлен `string`: типизированные маршруты
 * Next пропускают «известный путь плюс запрос», и такой возврат проходит
 * проверку без единого приведения.
 */
export function crmHref(query: CalendarQuery): `${typeof CRM_PATH}?${string}` {
  return `${CRM_PATH}?${new URLSearchParams(query).toString()}`;
}
