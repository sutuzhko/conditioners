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
import { WHO_SEPARATOR, type CalendarView, type ScheduleKind } from './model';

export type CalendarQuery = Record<string, string>;

/**
 * Состав слоя занятости: включён ли он, кого видно и не оставили ли на сетке
 * одну занятость (ADR-123, issue #49).
 *
 * 🔴 `who` — массив, а не `Set`: место целиком уезжает пропсами в клиентский
 * слушатель клавиш, а через границу сервера и клиента надёжно переживает
 * только то, что раскладывается в JSON. Порядок людей в нём тот же, что в
 * списке команды, — иначе один и тот же выбор давал бы два разных адреса.
 */
export interface CalendarLayer {
  readonly team: boolean;
  /** Кого видно в слое. `null` — всех, кто в нём есть. */
  readonly who: readonly string[] | null;
  /** Какие виды записей показывать. `null` — все три. */
  readonly kinds: readonly ScheduleKind[] | null;
}

/** Где мы сейчас: этого хватает, чтобы собрать любой переход. */
export interface CalendarPlace extends CalendarLayer {
  readonly view: CalendarView;
  readonly day: DayKey;
  readonly month: MonthKey;
  readonly today: DayKey;
}

/** Наложение занятости остаётся включённым при любом переходе внутри раздела. */
const TEAM_ON = 'on';

export function withTeam(query: CalendarQuery, team: boolean): CalendarQuery {
  return team ? { ...query, team: TEAM_ON } : query;
}

/**
 * Состав показанного целиком: слой людей и виды записей.
 *
 * 🔴 Состав людей живёт только при включённом слое: выключенный не оставляет
 * в адресе `who`, иначе слой включался бы в позапрошлом составе, о котором
 * человек уже не помнит. Виды записей от слоя не зависят — ими прячут заявки
 * и дела и с выключенным слоем.
 */
export function withLayer(query: CalendarQuery, layer: CalendarLayer): CalendarQuery {
  const kinds = layer.kinds === null ? query : { ...query, kinds: layer.kinds.join(WHO_SEPARATOR) };

  if (!layer.team) return kinds;

  return {
    ...kinds,
    team: TEAM_ON,
    ...(layer.who === null ? {} : { who: layer.who.join(WHO_SEPARATOR) }),
  };
}

/** Тот же экран без изменений: вид и период, с которых собираются переходы. */
export function hereQuery(place: CalendarPlace): CalendarQuery {
  const { view, month, day } = place;
  return view === 'month' ? { view, month } : { view, day };
}

/**
 * Другой состав людей в слое.
 *
 * 🔴 Пустой выбор гасит слой. Слой без единого человека — это его отсутствие,
 * и оставлять включённым переключатель над пустой сеткой значило бы врать про
 * состояние экрана; вернуть команду целиком можно тем же переключателем.
 */
export function whoQuery(place: CalendarPlace, who: readonly string[] | null): CalendarQuery {
  const here = hereQuery(place);
  const layer = { team: place.team, who, kinds: place.kinds };

  /* Слой гаснет, но виды записей остаются: это разные фильтры, и снятый
     последним человек не должен молча вернуть на сетку скрытые заявки. */
  if (who !== null && who.length === 0) {
    return withLayer(here, { ...layer, team: false, who: null });
  }

  /* Первый выбранный человек зажигает слой: карточка «Показывать» и есть его
     переключатель — отдельной кнопки в шапке макет не знает. */
  return withLayer(here, { ...layer, team: true });
}

/** Другой набор видов записей. Слой людей при этом не трогается. */
export function kindsQuery(
  place: CalendarPlace,
  kinds: readonly ScheduleKind[] | null,
): CalendarQuery {
  /* Снятые все три вернули бы пустую сетку без пути назад: пустой набор
     читается как «все», ровно так же его читает и разбор адреса. */
  const next = kinds !== null && kinds.length === 0 ? null : kinds;

  return withLayer(hereQuery(place), { team: place.team, who: place.who, kinds: next });
}

/**
 * Куда ведёт шаг назад или вперёд. Шаг зависит от вида: месяц листается
 * месяцами, неделя — неделями, день — днями.
 */
export function stepQuery(place: CalendarPlace, delta: number): CalendarQuery {
  const { view, day, month } = place;

  if (view === 'month') return withLayer({ view, month: shiftMonth(month, delta) }, place);
  if (view === 'week') return withLayer({ view, day: shiftWeek(day, delta) }, place);

  return withLayer({ view, day: shiftDay(day, delta) }, place);
}

/** «Сегодня» в текущем виде: месяц прыгает на месяц сегодняшнего дня. */
export function todayQuery(place: CalendarPlace): CalendarQuery {
  const { view, today } = place;

  return withLayer(
    view === 'month' ? { view, month: monthOfDay(today) } : { view, day: today },
    place,
  );
}

/**
 * Смена вида. Дата при этом не меняется: человек смотрит ту же неделю
 * по-другому, а не прыгает в сегодня.
 */
export function viewQuery(place: CalendarPlace, next: CalendarView): CalendarQuery {
  const { day, month } = place;

  return withLayer(next === 'month' ? { view: next, month } : { view: next, day }, place);
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
