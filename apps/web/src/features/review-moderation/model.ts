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
  readonly photo: string | null;
  readonly status: ReviewStatus;
  readonly createdAt: string;
};

export type ReviewActionResult = { readonly ok: boolean; readonly message?: string };

export type ReviewApi = {
  readonly setStatus: (id: string, status: ReviewStatus) => Promise<ReviewActionResult>;
  readonly remove: (id: string) => Promise<ReviewActionResult>;
};
