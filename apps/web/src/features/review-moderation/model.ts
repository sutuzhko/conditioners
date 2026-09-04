/** Модерация отзывов — контракт docs/API.md §7. */
import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  'pending',
  'approved',
  'rejected',
  'archived',
];

export function isReviewStatus(value: string): value is ReviewStatus {
  return REVIEW_STATUSES.some((status) => status === value);
}

// ---------- Вкладки раздела ----------

export const REVIEWS_PATH = '/admin/reviews';

/** Вкладки раздела из словаря адресов (issue #339). */
export const REVIEW_TABS = PANEL_TABS.reviews;
export type ReviewTab = PanelTab<'reviews'>;

/**
 * Вкладка в адресе → статус в базе.
 *
 * 🔴 Макет называет вкладку `published`, а домен — статусом `approved`:
 * словарь описывает адрес, домен описывает состояние отзыва, и переводит их
 * раздел на своей границе (ADR-255). Контракт `/api/admin/reviews` от этого
 * не двигается.
 *
 * `all` — не статус, а его отсутствие: вкладка снимает фильтр целиком.
 * Архивные отзывы своей вкладки на макете не имеют и живут здесь — удалять
 * их нельзя (инвариант 7), и потерять их из виду тоже нельзя.
 */
const STATUS_BY_TAB: Record<ReviewTab, ReviewStatus | undefined> = {
  pending: 'pending',
  published: 'approved',
  rejected: 'rejected',
  all: undefined,
};

/** Вкладка по умолчанию — первая: с неё раздел открывается без параметра. */
export const DEFAULT_REVIEW_TAB: ReviewTab = REVIEW_TABS[0];

/**
 * Вкладка из адреса. Мусор, чужой ключ и отсутствие параметра открывают
 * «На модерации» — раздел обязан открыться по любому адресу (issue #341).
 */
export function reviewTabFromParam(value: unknown): ReviewTab {
  return resolvePanelTab(REVIEW_TABS, value);
}

/** Статус, за которым раздел идёт в базу. `undefined` — все статусы сразу. */
export function reviewStatusOfTab(tab: ReviewTab): ReviewStatus | undefined {
  return STATUS_BY_TAB[tab];
}

/**
 * Параметры адреса вкладки. Умолчание опускается: ссылка на «На модерации» —
 * это `/admin/reviews`, без хвоста, который ничего не выбирает.
 */
export function reviewsQuery(tab: ReviewTab): Record<string, string> {
  return tab === DEFAULT_REVIEW_TAB ? {} : { tab };
}

export function reviewsHref(tab: ReviewTab): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: REVIEWS_PATH, query: reviewsQuery(tab) };
}

/**
 * Отзыв в модерации.
 *
 * 🔴 Полей для правки текста здесь нет и не будет: модератор меняет только
 * статус (инвариант 7). Редактируемый отзыв — это не отзыв.
 */
export type ReviewCard = {
  readonly id: string;
  readonly name: string;
  readonly rating: number;
  readonly text: string;
  /** Снимок места установки: по нему модератор и принимает решение. */
  readonly photo: string | null;
  /** Фотография автора; нет — рисуются инициалы, это тоже аватар. */
  readonly avatar: string | null;
  readonly status: ReviewStatus;
  readonly createdAt: string;
};

// ---------- Действия по вкладкам ----------

/**
 * Что можно сделать с отзывом.
 *
 * 🔴 Правки текста здесь нет и не будет (инвариант 7). Каждое действие —
 * это смена статуса, кроме `remove`: он стирает запись.
 */
export type ReviewAction = 'approve' | 'reject' | 'restore' | 'archive' | 'remove';

/**
 * Действия отзыва на открытой вкладке.
 *
 * 🔴 Не все возможные, а те, ради которых на вкладку зашли. Раньше в ряду
 * стояли четыре действия четырёх уровней заметности разом — «Опубликовать»
 * сплошной, «Отклонить» контурной, «В архив» текстовой и красное «Удалить»
 * (BUGS, разнобой панели). Решение на очереди модерации одно из двух, и
 * ряд должен показывать именно два.
 */
export function reviewActionsFor(tab: ReviewTab, status: ReviewStatus): readonly ReviewAction[] {
  if (tab === 'pending') return ['approve', 'reject'];
  if (tab === 'published') return ['archive'];
  if (tab === 'rejected') return ['restore', 'remove'];

  /* «Все» — сквозной список: действия те же, что дала бы своя вкладка отзыва.
     Иначе найденный здесь отзыв пришлось бы искать ещё раз там, где его можно
     опубликовать. Удаление остаётся только у тех, кто с сайта уже снят. */
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return ['archive'];
  return ['restore', 'remove'];
}

/** Статус, в который переводит действие. `remove` статуса не имеет. */
export const REVIEW_ACTION_STATUS: Record<Exclude<ReviewAction, 'remove'>, ReviewStatus> = {
  approve: 'approved',
  reject: 'rejected',
  restore: 'pending',
  archive: 'archived',
};

export type ReviewActionResult = { readonly ok: boolean; readonly message?: string };

export type ReviewApi = {
  readonly setStatus: (id: string, status: ReviewStatus) => Promise<ReviewActionResult>;
  readonly remove: (id: string) => Promise<ReviewActionResult>;
};
