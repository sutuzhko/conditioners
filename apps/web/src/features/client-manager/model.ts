/** Раздел клиентов: типы представления. Доменные схемы — в `entities/client`. */
import type { LeadStatus } from '@/entities/lead/model';

export type { ClientCard, ClientCreate, ClientPage, ClientUpdate } from '@/entities/client/model';

export { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

export { leadStatusTitle, type LeadStatus } from '@/entities/lead/model';

/** Ответ действия: успех либо готовый к показу текст ошибки. */
export type ClientResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string; readonly field?: string };

/** Поля формы — строки, как их вводит человек. */
export type ClientDraft = {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly note: string;
};

export const emptyClientDraft: ClientDraft = { name: '', phone: '', address: '', note: '' };

/**
 * Действия раздела вынесены интерфейсом: истории и тесты подставляют свои,
 * не поднимая сеть.
 */
export type ClientApi = {
  readonly create: (draft: ClientDraft) => Promise<ClientResult>;
  readonly update: (id: string, draft: ClientDraft) => Promise<ClientResult>;
  readonly remove: (id: string) => Promise<ClientResult>;
};

export type ClientStatus = 'idle' | 'sending' | 'success' | 'error';

/** Обращение в карточке клиента: столько, сколько нужно, чтобы вспомнить разговор. */
export type ClientLead = {
  readonly id: string;
  readonly topic: string;
  readonly status: LeadStatus;
  readonly comment: string | null;
  readonly createdAt: string;
};
