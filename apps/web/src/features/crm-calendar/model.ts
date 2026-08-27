import type { DayBlockLike } from '@/entities/crm/lib/busy';
import type { CrmEventKind, CrmEventStatus, DayBlockRepeat } from '@/entities/crm/model';
import type { OrderStatus, OrderType } from '@/entities/order/model';

/**
 * Вид календаря. 🔴 Живёт в адресе (`?view=week`) и по-английски, как месяц и
 * день: параметры адресуемого не транслитерируются (инвариант 17).
 *
 * Вида «по монтажникам» здесь нет намеренно: занятость команды показывается
 * наложением на ту же сетку по переключателю `?team=on`, а не отдельным видом
 * с колонкой на человека (ADR-123). Владелец назначает наряд, глядя на всю
 * команду разом, а не перебирая людей по очереди.
 */
export const CALENDAR_VIEWS = ['month', 'week', 'day'] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/**
 * Разбор параметра адреса.
 *
 * 🔴 Умолчание — неделя, а не месяц (ADR-128): там видно и время, и загрузку
 * команды, а месяц отвечает только на вопрос «что вообще на этой неделе».
 *
 * Незнакомое значение даёт то же умолчание, а не ошибку: адрес календаря
 * правят руками и присылают друг другу, и отказ вместо сетки там ничего не
 * объясняет (то же правило, что у месяца в `/api/admin/blocks`).
 */
export function parseCalendarView(value: string | undefined): CalendarView {
  return CALENDAR_VIEWS.find((view) => view === value) ?? 'week';
}

/**
 * Переключатель «Занятость монтажников» — тоже в адресе и по-английски.
 * Включённым считается только `on`: любое другое значение — выключено, как и
 * незнакомый вид (адрес правят руками).
 */
export function parseTeamFlag(value: string | undefined): boolean {
  return value === 'on';
}

/**
 * Дело в том виде, в каком его показывают. Момент времени — строкой ISO:
 * день и время из него достаёт `shared/lib/calendar` в поясе работ, чтобы
 * серверный и клиентский рендер не разошлись на час.
 */
export type CrmEventCard = {
  readonly id: string;
  readonly kind: CrmEventKind;
  readonly status: CrmEventStatus;
  readonly at: string;
  /** Сколько дело занимает: на часовой сетке оно отрезок, а не точка. */
  readonly durationMin: number;
  /** Минуты за рабочим окном на момент записи. Только на чтение (ADR-138). */
  readonly overtimeMin: number;
  readonly clientName: string;
  readonly clientPhone: string | null;
  readonly address: string | null;
  readonly note: string | null;
  readonly leadId: string | null;
};

/**
 * Заявка в календаре. Она попадает туда сама, днём обращения, и правится
 * только в своём разделе: календарь показывает, что человек написал, но не
 * делает вид, будто заявкой можно управлять отсюда.
 */
export type CalendarLead = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly topic: string;
  readonly at: string;
};

/**
 * Наряд в календаре — CRM.md §3.5: у монтажника календарь это его выезды.
 *
 * 🔴 Денег в нём нет: наряд и в сетке остаётся нарядом, но сумма, выплата и
 * удержание живут в своём разделе, где проверяется доступ (ADR-114). Сюда
 * попадает ровно то, что нужно, чтобы понять, кто куда и когда едет.
 */
export type CalendarOrderCard = {
  readonly id: string;
  readonly number: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly at: string;
  readonly durationMin: number;
  readonly address: string;
  readonly clientName: string;
  readonly installerId: string | null;
  readonly installerName: string | null;
};

export type CrmEventDraft = {
  readonly kind: CrmEventKind;
  readonly day: string;
  readonly time: string;
  /**
   * Сколько дело занимает. 🔴 Появилось вместе с часовой сеткой (ADR-128):
   * без длительности запись нечем нарисовать — «занято с 11 до 20» это
   * отрезок, а не точка.
   */
  readonly durationMin: number;
  readonly clientName: string;
  readonly clientPhone: string;
  readonly address: string;
  readonly note: string;
  readonly leadId: string | null;
};

export type CrmResult = { readonly ok: boolean; readonly message?: string };

/**
 * Занятость в том виде, в каком её показывают: разрешение занятости читает у
 * неё повтор, день и окно, а панель дня — ещё и чья она.
 */
export type DayBlockCard = DayBlockLike & {
  readonly id: string;
  readonly userId: string;
  readonly userName: string | null;
};

/**
 * Черновик занятости. Форма думает временем и переключателем «весь день», а
 * не минутами от полуночи: перевод — дело `lib`, а не человека.
 */
export type DayBlockDraft = {
  readonly repeat: DayBlockRepeat;
  readonly day: string;
  /** День недели по ISO-8601 у повторяемой занятости. */
  readonly weekday: number;
  readonly allDay: boolean;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
};

/**
 * Длительность дела по умолчанию — час (ADR-138). Шаг — пятнадцать минут, тот
 * же, что у наряда: полчаса на звонок и полтора часа на замер одинаково обычны.
 */
export const DEFAULT_EVENT_MIN = 60;
export const DURATION_STEP_MIN = 15;

/** Минимальная длительность: меньше четверти часа не задаёт и схема дела. */
export const MIN_EVENT_MIN = 15;
