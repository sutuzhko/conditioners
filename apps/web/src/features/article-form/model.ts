/** Правка статьи базы знаний — контракт docs/API.md §6. */
import type { Route } from 'next';

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
