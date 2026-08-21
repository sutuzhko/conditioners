/** Отправка статьи — контракт docs/API.md §6. */
import { articleFormContent as texts } from './content';
import type { ArticleFormValues, ArticleSaveResult } from './model';

export function toRequestBody(values: ArticleFormValues): Record<string, unknown> {
  const optional = (value: string): string | null => (value.trim() === '' ? null : value.trim());

  return {
    title: values.title.trim(),
    category: values.category.trim(),
    date: values.date,
    minutes: values.minutes,
    excerpt: values.excerpt.trim(),
    /* Текст не обрезается по краям целиком, а только по концам строки-обёртки:
       внутри мини-разметки пустая строка разделяет блоки и значима. */
    body: values.body.trim(),
    published: values.published,
    seoTitle: optional(values.seoTitle),
    seoDescription: optional(values.seoDescription),
    ...(values.slug.trim() === '' ? {} : { slug: values.slug.trim() }),
  };
}

function readError(payload: unknown): { message?: string; field?: string } | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return undefined;

  const { message, field } = error as Record<string, unknown>;
  return {
    ...(typeof message === 'string' ? { message } : {}),
    ...(typeof field === 'string' && field !== '' ? { field } : {}),
  };
}

async function send(
  url: string,
  method: 'POST' | 'PUT',
  values: ArticleFormValues,
): Promise<ArticleSaveResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequestBody(values)),
    });
  } catch {
    return { ok: false, message: texts.networkError };
  }

  if (response.status === 401) return { ok: false, message: texts.sessionError };

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) {
    const id = (payload as { id?: unknown } | null)?.id;
    return { ok: true, id: typeof id === 'string' ? id : '' };
  }

  const error = readError(payload);
  return {
    ok: false,
    message: error?.message ?? texts.serverError,
    ...(error?.field === undefined ? {} : { field: error.field }),
  };
}

export function createArticle(values: ArticleFormValues): Promise<ArticleSaveResult> {
  return send('/api/admin/articles', 'POST', values);
}

export function updateArticle(id: string, values: ArticleFormValues): Promise<ArticleSaveResult> {
  return send(`/api/admin/articles/${id}`, 'PUT', values);
}

export async function deleteArticle(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (response.ok) return { ok: true };
    if (response.status === 401) return { ok: false, message: texts.sessionError };
    return { ok: false, message: texts.serverError };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}
