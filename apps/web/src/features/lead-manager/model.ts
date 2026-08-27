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
  readonly place: string | null;
  readonly qty: string | null;
  readonly callTime: string | null;
  readonly address: string | null;
  readonly comment: string | null;
  readonly photo: string | null;
  readonly sourceUrl: string | null;
  readonly status: LeadStatus;
  readonly managerComment: string | null;
  /** Клиент, к которому привязано обращение; `null` — в базу его ещё не завели. */
  readonly clientId: string | null;
  /** ISO: форматируется при показе, чтобы сервер и клиент не разошлись в часовом поясе. */
  readonly createdAt: string;
  readonly consentAt: string;
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
