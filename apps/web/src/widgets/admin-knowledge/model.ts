/**
 * Отбор статей в панели.
 *
 * 🔴 Условия живут в адресе, а не в состоянии компонента (ADR-105): найденное
 * можно оставить в закладках, прислать себе и вернуться к нему завтра, а
 * «назад» браузера возвращает к прошлому отбору. Своего JavaScript у фильтров
 * поэтому нет вовсе — обычная форма `method="get"` и ссылки разбивки.
 */
import { KNOWLEDGE_PATH } from '@/features/article-form';

/** Состояние статьи как условие отбора. */
export const ARTICLE_STATES = ['published', 'draft'] as const;
export type ArticleState = (typeof ARTICLE_STATES)[number];

/** Порядок списка. Умолчание — «сначала новые», как на сайте. */
export const ARTICLE_ORDERS = ['new', 'old'] as const;
export type ArticleOrder = (typeof ARTICLE_ORDERS)[number];

/** Что выбрано сейчас. Пустая строка и `undefined` означают «условия нет». */
export type ArticleFilter = {
  readonly query: string;
  readonly category: string;
  readonly state: ArticleState | undefined;
  readonly order: ArticleOrder | undefined;
};

/** Параметры адреса раздела — ровно то, что приходит в `searchParams`. */
export type ArticleSearchParams = {
  readonly q?: string | undefined;
  readonly category?: string | undefined;
  readonly state?: string | undefined;
  readonly order?: string | undefined;
  readonly page?: string | undefined;
};

function stateOf(value: string | undefined): ArticleState | undefined {
  return ARTICLE_STATES.find((state) => state === value);
}

function orderOf(value: string | undefined): ArticleOrder | undefined {
  return ARTICLE_ORDERS.find((order) => order === value);
}

/**
 * Отбор из адреса.
 *
 * Мусор в параметре снимает условие, а не роняет раздел: адрес правят руками
 * и присылают друг другу, и отказ вместо списка там ничего не объясняет.
 */
export function articleFilterOf(params: ArticleSearchParams): ArticleFilter {
  return {
    query: params.q?.trim() ?? '',
    category: params.category?.trim() ?? '',
    state: stateOf(params.state),
    order: orderOf(params.order),
  };
}

/**
 * Условия отбора как параметры адреса: их несут за собой ссылки разбивки.
 *
 * Умолчания опускаются: ссылка на первую страницу без фильтров — это
 * `/admin/knowledge`, без хвоста, который ничего не выбирает.
 */
export function articleFilterQuery(filter: ArticleFilter): Record<string, string> {
  return {
    ...(filter.query === '' ? {} : { q: filter.query }),
    ...(filter.category === '' ? {} : { category: filter.category }),
    ...(filter.state === undefined ? {} : { state: filter.state }),
    ...(filter.order === undefined || filter.order === 'new' ? {} : { order: filter.order }),
  };
}

/** Выбрано ли хоть что-то: от этого зависит, какое пустое состояние показать. */
export function articleFilterOn(filter: ArticleFilter): boolean {
  return Object.keys(articleFilterQuery(filter)).length > 0;
}

export { KNOWLEDGE_PATH };
