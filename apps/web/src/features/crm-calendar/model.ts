import type { CrmEventKind, CrmEventStatus } from '@/entities/crm/model';

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
