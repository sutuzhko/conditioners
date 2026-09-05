/** Модерация отзывов — контракт docs/API.md §7. */
import type { ReviewModeration } from '@/entities/review/model';
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
 */
const STATUS_BY_TAB: Record<ReviewTab, ReviewStatus | undefined> = {
  pending: 'pending',
  published: 'approved',
  rejected: 'rejected',
  archived: 'archived',
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
 * 🔴 Карточки остались только на «На модерации» (issue #613, макет
 * `ContentTabs`).
 *
 * Там решают по тексту целиком, и карточка — единственный способ показать его
 * без «показать ещё». На остальных вкладках решение уже принято: туда заходят
 * искать конкретный отзыв, и колонки со сравнимыми значениями делают это
 * быстрее, чем четыре одинаковых карточки на экран.
 */
export function reviewTabShowsTable(tab: ReviewTab): tab is Exclude<ReviewTab, 'pending'> {
  return tab !== 'pending';
}

// ---------- Сквозной отбор вкладки «Все» ----------

/** Оценки, по которым отбирают: шкала отзыва целиком. */
export const REVIEW_RATINGS: readonly number[] = [5, 4, 3, 2, 1];

/**
 * Что выбрано на вкладке «Все».
 *
 * 🔴 Отбор живёт в адресе, а не в состоянии компонента (ADR-105): найденный
 * отзыв можно прислать себе ссылкой, а «назад» возвращает к прошлому поиску.
 */
export type ReviewFilter = {
  readonly query: string;
  readonly status: ReviewStatus | undefined;
  readonly rating: number | undefined;
};

export const EMPTY_REVIEW_FILTER: ReviewFilter = {
  query: '',
  status: undefined,
  rating: undefined,
};

/** Параметры адреса раздела — ровно то, что приходит в `searchParams`. */
export type ReviewSearchParams = {
  readonly tab?: string | undefined;
  readonly page?: string | undefined;
  readonly q?: string | undefined;
  readonly status?: string | undefined;
  readonly rating?: string | undefined;
};

/**
 * Отбор из адреса.
 *
 * Мусор в параметре снимает условие, а не роняет раздел: адрес правят руками
 * и присылают друг другу, и отказ вместо списка там ничего не объясняет
 * (issue #341).
 */
export function reviewFilterOf(params: ReviewSearchParams): ReviewFilter {
  const rating = Number.parseInt(params.rating ?? '', 10);

  return {
    query: params.q?.trim() ?? '',
    status:
      params.status !== undefined && isReviewStatus(params.status) ? params.status : undefined,
    rating: REVIEW_RATINGS.find((value) => value === rating),
  };
}

/** Условия отбора как параметры адреса: их несут за собой ссылки разбивки. */
export function reviewFilterQuery(filter: ReviewFilter): Record<string, string> {
  return {
    ...(filter.query === '' ? {} : { q: filter.query }),
    ...(filter.status === undefined ? {} : { status: filter.status }),
    ...(filter.rating === undefined ? {} : { rating: String(filter.rating) }),
  };
}

/** Выбрано ли хоть что-то: от этого зависит, какое пустое состояние показать. */
export function reviewFilterOn(filter: ReviewFilter): boolean {
  return Object.keys(reviewFilterQuery(filter)).length > 0;
}

/**
 * Параметры адреса вкладки. Умолчание опускается: ссылка на «На модерации» —
 * это `/admin/reviews`, без хвоста, который ничего не выбирает.
 *
 * Отбор вкладки «Все» едет тем же набором: разбивка обязана нести его за
 * собой, иначе вторая страница найденного показывает весь раздел.
 */
export function reviewsQuery(
  tab: ReviewTab,
  filter: ReviewFilter = EMPTY_REVIEW_FILTER,
): Record<string, string> {
  return {
    ...(tab === DEFAULT_REVIEW_TAB ? {} : { tab }),
    ...reviewFilterQuery(filter),
  };
}

export function reviewsHref(
  tab: ReviewTab,
  filter: ReviewFilter = EMPTY_REVIEW_FILTER,
): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: REVIEWS_PATH, query: reviewsQuery(tab, filter) };
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
  /** Отказ целиком: причина, кто и когда. У неотклонённого — `null`. */
  readonly reject: ReviewReject | null;
  readonly createdAt: string;
};

/** Запись отказа. Половины у неё не бывает: причина без даты ничего не значит. */
export type ReviewReject = {
  readonly reason: string;
  /** Имя модератора; `null` — отклонили кнопкой в Telegram или учётку удалили. */
  readonly by: string | null;
  readonly at: string;
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

  /* В архиве отзыв не плохой, а отложенный: его возвращают на модерацию, а
     не стирают. Удаления здесь нет намеренно — архив для того и заведён,
     чтобы убрать с сайта, ничего не потеряв (ADR-300). */
  if (tab === 'archived') return ['approve', 'restore'];

  /* «Все» — сквозной список: действия те же, что дала бы своя вкладка отзыва.
     Иначе найденный здесь отзыв пришлось бы искать ещё раз там, где его можно
     опубликовать.

     🔴 Удаление остаётся только у отклонённых. Архив заведён ровно затем,
     чтобы убрать с сайта, ничего не потеряв (ADR-300), — кнопка «Удалить» в
     нём отменяла бы смысл состояния. Отклонённый — другое дело: там реклама
     и спам, и держать их вечно незачем. */
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return ['archive'];
  if (status === 'archived') return ['approve', 'restore'];
  return ['restore', 'remove'];
}

/**
 * Статус, в который переводит действие.
 *
 * `remove` статуса не имеет — он стирает запись. `reject` тоже не здесь: отказ
 * несёт причину (ADR-300), и одним статусом он не описывается — карточка
 * сначала спрашивает её окном.
 */
export const REVIEW_ACTION_STATUS: Record<
  Exclude<ReviewAction, 'remove' | 'reject'>,
  Exclude<ReviewStatus, 'rejected'>
> = {
  approve: 'approved',
  restore: 'pending',
  archive: 'archived',
};

export type ReviewActionResult = { readonly ok: boolean; readonly message?: string };

export type ReviewApi = {
  /* Не `status`, а решение целиком: у отказа с ним неразрывно идёт причина, и
     разнести их по двум аргументам значило бы позволить отказ без неё. */
  readonly setStatus: (id: string, moderation: ReviewModeration) => Promise<ReviewActionResult>;
  readonly remove: (id: string) => Promise<ReviewActionResult>;
};
