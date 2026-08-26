import type { DayBlockLike } from '@/entities/crm/lib/busy';
import type { CrmEventKind, CrmEventStatus, DayBlockRepeat } from '@/entities/crm/model';

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

export type CrmEventDraft = {
  readonly kind: CrmEventKind;
  readonly day: string;
  readonly time: string;
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
