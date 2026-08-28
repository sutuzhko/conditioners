/** Раздел клиентов: типы представления. Доменные схемы — в `entities/client`. */
import { dayOf } from '@/entities/client/lib/units';
import type { ClientUnitCard } from '@/entities/client/model';
import type { LeadStatus } from '@/entities/lead/model';

export type { ClientCard, ClientCreate, ClientPage, ClientUpdate } from '@/entities/client/model';

export { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

export { leadStatusTitle, type LeadStatus } from '@/entities/lead/model';

/* ---------- Адреса раздела ---------- */

export const CLIENTS_PATH = '/admin/clients';

/**
 * Адрес окна создания (ADR-117). Окно живёт по собственному адресу, а не в
 * состоянии компонента: иначе ссылку на форму нельзя прислать, «назад» уводит
 * из раздела, а обновление страницы теряет ввод.
 */
export const CLIENT_NEW_PATH = '/admin/clients/new';

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

/* ---------- Техника клиента ---------- */

export type { ClientUnitCard } from '@/entities/client/model';

export {
  dayOf,
  serviceDueDay,
  warrantyOver,
  SERVICE_PERIOD_MONTHS,
} from '@/entities/client/lib/units';

/** Поля формы техники — строки, как их вводит человек. Даты — дни, не моменты. */
export type ClientUnitDraft = {
  readonly model: string;
  readonly installedAt: string;
  readonly warrantyUntil: string;
};

export const emptyUnitDraft: ClientUnitDraft = { model: '', installedAt: '', warrantyUntil: '' };

/** Запись → поля формы: даты показываются днём в поясе работ. */
export function unitDraftOf(unit: ClientUnitCard): ClientUnitDraft {
  return {
    model: unit.model,
    installedAt: dayOf(unit.installedAt),
    warrantyUntil: unit.warrantyUntil === null ? '' : dayOf(unit.warrantyUntil),
  };
}

/** Действия с техникой. Вынесены интерфейсом — истории и тесты подставляют свои. */
export type ClientUnitApi = {
  readonly create: (clientId: string, draft: ClientUnitDraft) => Promise<ClientResult>;
  readonly update: (
    clientId: string,
    unitId: string,
    draft: ClientUnitDraft,
  ) => Promise<ClientResult>;
  readonly remove: (clientId: string, unitId: string) => Promise<ClientResult>;
};
