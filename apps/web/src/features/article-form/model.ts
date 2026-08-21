/** Правка статьи базы знаний — контракт docs/API.md §6. */
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
