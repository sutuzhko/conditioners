/** Отправка статьи — контракт docs/API.md §6. */
import { adminRequest, createdSchema, jsonInit } from '@/shared/lib/api';
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { articleCoverContent, articleFormContent as texts } from './content';
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

/* Общий разбор ответа (ADR-030): фича оставляет только свои формулировки. */
const FORM_TEXTS = {
  network: texts.networkError,
  server: texts.serverError,
  session: texts.sessionError,
};

async function send(
  url: string,
  method: 'POST' | 'PUT',
  values: ArticleFormValues,
): Promise<ArticleSaveResult> {
  const result = await adminRequest(url, jsonInit(method, toRequestBody(values)), FORM_TEXTS);

  if (result.ok) {
    const created = createdSchema.safeParse(result.payload);
    return { ok: true, id: created.success ? created.data.id : '' };
  }

  return {
    ok: false,
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}

export function createArticle(values: ArticleFormValues): Promise<ArticleSaveResult> {
  return send('/api/admin/articles', 'POST', values);
}

export function updateArticle(id: string, values: ArticleFormValues): Promise<ArticleSaveResult> {
  return send(`/api/admin/articles/${id}`, 'PUT', values);
}

export async function deleteArticle(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await adminRequest(`/api/admin/articles/${id}`, { method: 'DELETE' }, FORM_TEXTS);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/** Загрузка обложки — отдельная ручка: это файл, а не поле формы. */
export async function uploadCover(
  id: string,
  file: File,
): Promise<{ ok: boolean; message?: string }> {
  const form = new FormData();
  form.append('cover', file);

  const result = await adminRequest(
    `/api/admin/articles/${id}/cover`,
    {
      method: 'POST',
      body: form,
    },
    {
      ...ADMIN_API_TEXTS,
      network: articleCoverContent.networkError,
      server: articleCoverContent.serverError,
    },
  );

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/** Снятие обложки — та же ручка, другой метод: обложка живёт вне тела формы. */
export async function removeCover(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await adminRequest(
    `/api/admin/articles/${id}/cover`,
    { method: 'DELETE' },
    {
      ...ADMIN_API_TEXTS,
      network: articleCoverContent.networkError,
      server: articleCoverContent.serverError,
    },
  );

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
