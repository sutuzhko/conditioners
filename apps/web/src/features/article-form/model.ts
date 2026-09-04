/** Правка статьи базы знаний — контракт docs/API.md §6. */
import type { Route } from 'next';

import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';

/**
 * Адрес раздела: запасной выход окна создания.
 *
 * Проверен маршрутом Next, а не оставлен голой строкой (ADR-141): опечатка
 * всплывёт на сборке, а не у человека, нажавшего «Закрыть» во вкладке,
 * открытой прямо на адресе окна.
 *
 * 🔴 Через `satisfies`, а не аннотацией `: Route`. Аннотация расширяет тип
 * константы до объединения всех маршрутов проекта, и адреса, которые из неё
 * достраиваются, ломаются: `${CATALOG_PATH}/${id}` перестал быть
 * `/admin/catalog/${string}` и стал в том числе `//${string}`, а
 * `StockMoveHref` — вообще любым маршрутом с любым запросом. `satisfies`
 * проверяет то же самое и оставляет литерал литералом.
 */
export const KNOWLEDGE_PATH = '/admin/knowledge' satisfies Route;

/**
 * Адрес окна создания. Держать его строкой в разметке списка — значит иметь
 * два места, где написан один адрес: ссылка «Новая статья» и перехватывающий
 * маршрут, который её ловит.
 */
export const KNOWLEDGE_NEW_PATH = '/admin/knowledge/new' satisfies Route;

// ---------- Вкладки правки статьи ----------

/** Вкладки статьи из словаря адресов (issue #339): «Текст», «SEO», «Публикация». */
export const ARTICLE_TABS = PANEL_TABS.article;
export type ArticleTab = PanelTab<'article'>;

/** Вкладка по умолчанию — первая: с неё статья открывается без параметра. */
export const DEFAULT_ARTICLE_TAB: ArticleTab = ARTICLE_TABS[0];

/**
 * Вкладка из адреса. Мусор, чужой ключ и отсутствие параметра открывают
 * «Текст» — статья обязана открыться по любому адресу (issue #341).
 */
export function articleTabFromParam(value: unknown): ArticleTab {
  return resolvePanelTab(ARTICLE_TABS, value);
}

/**
 * Параметры адреса вкладки. Умолчание опускается: ссылка на «Текст» — это
 * адрес статьи без хвоста, который ничего не выбирает.
 */
export function articleTabQuery(tab: ArticleTab): Record<string, string> {
  return tab === DEFAULT_ARTICLE_TAB ? {} : { tab };
}

export function articleEditHref(
  id: string,
  tab: ArticleTab,
): { readonly pathname: string; readonly query: Record<string, string> } {
  return { pathname: `${KNOWLEDGE_PATH}/${id}`, query: articleTabQuery(tab) };
}

/**
 * Пределы длины полей выдачи.
 *
 * 🔴 Это не запрет, а счётчик: заголовок длиннее обрезается в поиске
 * многоточием и стоит кликов, но написать его владелец вправе — он видит
 * последствие в превью рядом. Числа — обычная ширина сниппета Яндекса и
 * Google; они не про базу и не про схему, поэтому живут здесь.
 */
export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 160;

export type ArticleFormValues = {
  readonly title: string;
  readonly category: string;
  /** Календарный день по времени Тулы: `2026-08-21`. */
  readonly date: string;
  readonly minutes: string;
  readonly excerpt: string;
  /** Мини-разметка: `##`, `###`, `- `, `> `, `**жирный**`, блоки через пустую строку. */
  readonly body: string;
  readonly published: boolean;
  readonly slug: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
};

export type ArticleFormStatus = 'idle' | 'sending' | 'success' | 'error';

export type ArticleSaveResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string; readonly field?: string };

export type ArticleSave = (values: ArticleFormValues) => Promise<ArticleSaveResult>;

export type ArticleDelete = () => Promise<{ readonly ok: boolean; readonly message?: string }>;

export const emptyArticleValues: ArticleFormValues = {
  title: '',
  category: '',
  date: '',
  minutes: '5',
  excerpt: '',
  body: '',
  published: false,
  slug: '',
  seoTitle: '',
  seoDescription: '',
};
