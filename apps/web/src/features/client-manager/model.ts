/** Раздел клиентов: типы представления. Доменные схемы — в `entities/client`. */
import type { Route } from 'next';

import { dayOf } from '@/entities/client/lib/units';
import type { ClientUnitCard } from '@/entities/client/model';
import type { LeadStatus } from '@/entities/lead/model';
import type { OrderStatus, OrderType } from '@/entities/order/model';
import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';

export type { ClientCard, ClientCreate, ClientPage, ClientUpdate } from '@/entities/client/model';

export { ADMIN_PAGE_SIZE, pageNumber } from '@/shared/lib/paging';

export { LEAD_STATUS_VARIANT, leadStatusTitle, type LeadStatus } from '@/entities/lead/model';

/* ---------- Адреса раздела ---------- */

export const CLIENTS_PATH = '/admin/clients' satisfies Route;

/**
 * Адрес окна создания (ADR-117). Окно живёт по собственному адресу, а не в
 * состоянии компонента: иначе ссылку на форму нельзя прислать, «назад» уводит
 * из раздела, а обновление страницы теряет ввод.
 *
 * Проверен маршрутом через `satisfies` — как и остальные адреса разделов, см.
 * `article-form/model.ts`.
 */
export const CLIENT_NEW_PATH = '/admin/clients/new' satisfies Route;

/* ---------- Вкладки карточки ---------- */

/**
 * Три вкладки карточки клиента: данные, заказы, техника (issue #350).
 *
 * 🔴 «Техника» — половина смысла карточки (CRM.md §3.2): она появляется сама
 * после выполненного монтажа и отвечает на вопрос «что у человека стоит и до
 * какого числа на это гарантия». В прежнем макете вкладки не было вовсе, и
 * верстающий по нему её терял.
 */
export const CLIENT_CARD_TABS = PANEL_TABS.clientCard;
export type ClientCardTab = PanelTab<'clientCard'>;

/** Вкладка из адреса. Мусор и пустота открывают «Данные» (issue #341). */
export function clientCardTabFromParam(value: unknown): ClientCardTab {
  return resolvePanelTab(CLIENT_CARD_TABS, value);
}

/**
 * Наряд в карточке клиента: номер, когда, что за работа, чем кончилось и на
 * какую сумму (CRM.md §3.2).
 *
 * 🔴 Проекция, а не `OrderCard` целиком. Через границу сервер→клиент уезжает
 * ровно то, что видно на экране: позиции оборудования, чеклист и заметка
 * владельца в карточке клиента не показываются, а значит и приезжать в
 * браузер им незачем.
 */
export type ClientOrder = {
  readonly id: string;
  readonly number: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  /** ISO в UTC: в московское время переводит подпись при показе. */
  readonly at: string;
  readonly address: string;
  /** Сумма заказа. `null` — наряд без денег: цену ещё не проставили. */
  readonly price: number | null;
  readonly installerName: string | null;
};

/** Наряды клиента с общим их числом: карточка показывает последние. */
export type ClientOrders = {
  readonly items: readonly ClientOrder[];
  readonly total: number;
};

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
