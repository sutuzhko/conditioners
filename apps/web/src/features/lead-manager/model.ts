import type { LeadContext } from '@/entities/lead/model';

/** Заявка в админке — контракт docs/API.md §8. */
export type LeadStatus = 'new' | 'in_progress' | 'done' | 'rejected';

export const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'in_progress', 'done', 'rejected'];

/**
 * Значение из `select` — строка. Приведение типа на проекте запрещено, а
 * молча принять чужую строку как статус значит отправить на сервер мусор.
 */
export function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.some((status) => status === value);
}

export type LeadCard = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly topic: string;
  /**
   * Модель, которую человек видел в поле формы и подтвердил (ADR-129). Не то же
   * самое, что `context.model`: там снимок карточки, с которой он пришёл, — и
   * подписи в карточке заявки эти две вещи различают.
   */
  readonly model: string | null;
  readonly place: string | null;
  readonly qty: string | null;
  readonly callTime: string | null;
  readonly address: string | null;
  readonly comment: string | null;
  readonly photo: string | null;
  readonly sourceUrl: string | null;
  /**
   * Что человек делал на сайте до отправки: расчёт, подбор, модели. Снимок на
   * момент отправки — цены в нём те, что стояли на экране, и переспрашивать у
   * каталога сегодняшние нельзя (иначе разговор начнётся со спора о цене).
   */
  readonly context: LeadContext | null;
  readonly status: LeadStatus;
  readonly managerComment: string | null;
  /** Клиент, к которому привязано обращение; `null` — в базу его ещё не завели. */
  readonly clientId: string | null;
  /** ISO: форматируется при показе, чтобы сервер и клиент не разошлись в часовом поясе. */
  readonly createdAt: string;
  readonly consentAt: string;
};

/* ---------- Адрес раздела ---------- */

export const LEADS_PATH = '/admin/leads';

/**
 * Что выбрано в разделе: статус, страница очереди и открытое обращение.
 *
 * 🔴 Всё три живут в адресе, а не в состоянии компонента (issue #349).
 * Обращение открывают, чтобы кому-то его переслать; на узком экране карточка
 * занимает весь экран, и «назад» браузера обязано возвращать к очереди, а не
 * выбрасывать из раздела.
 */
export type LeadsView = {
  readonly status?: LeadStatus | undefined;
  readonly page?: number | undefined;
  readonly lead?: string | undefined;
};

/** Параметры адреса. Умолчания опускаются: ссылка не тащит пустых хвостов. */
export function leadsQuery(view: LeadsView): Record<string, string> {
  return {
    ...(view.status === undefined ? {} : { status: view.status }),
    ...(view.page === undefined || view.page <= 1 ? {} : { page: String(view.page) }),
    ...(view.lead === undefined || view.lead === '' ? {} : { lead: view.lead }),
  };
}

export function leadsHref(view: LeadsView): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: LEADS_PATH, query: leadsQuery(view) };
}

/** Строка очереди: столько, сколько нужно, чтобы выбрать, кому звонить. */
export type LeadQueueItem = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly topic: string;
  readonly status: LeadStatus;
  readonly createdAt: string;
};

export type LeadPatch = {
  readonly status?: LeadStatus;
  readonly managerComment?: string | null;
};

export type LeadUpdateResult = { readonly ok: boolean; readonly message?: string };

export type LeadUpdate = (id: string, patch: LeadPatch) => Promise<LeadUpdateResult>;

/** Чем закончилось «В клиенты»: карточку завели или нашли по телефону. */
export type LeadToClientResult =
  | { readonly ok: true; readonly clientId: string; readonly created: boolean }
  | { readonly ok: false; readonly message: string };

export type LeadToClient = (id: string) => Promise<LeadToClientResult>;

/**
 * Чем закончилось «Создать заказ»: клиент заведён (или найден), обращение
 * переведено в работу. Сам наряд ещё черновик — его открывает форма.
 */
export type LeadToOrderResult =
  | { readonly ok: true; readonly clientId: string; readonly status: LeadStatus }
  | { readonly ok: false; readonly message: string };

export type LeadToOrder = (id: string) => Promise<LeadToOrderResult>;
