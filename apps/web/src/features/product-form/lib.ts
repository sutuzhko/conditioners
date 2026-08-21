/** Приведение модели к форме и обратно, отправка — контракт docs/API.md §3. */
import type { Product } from '@/entities/product/model';

import { productFormContent as texts } from './content';
import { emptyProductValues, type ProductFormValues, type ProductSaveResult } from './model';

/** Строка из значения, которого может не быть: в поле ввода попадает текст, а не `null`. */
function text(value: string | number | null): string {
  return value === null ? '' : String(value);
}

export function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    badge: product.badge,
    areaMax: text(product.areaMax),
    priceNum: text(product.priceNum),
    tag: text(product.tag),
    brand: text(product.brand),
    sku: text(product.sku),
    link: text(product.link),
    slug: product.slug,
    sort: text(product.sort),
    visible: product.visible,
    seoTitle: text(product.seoTitle),
    seoDescription: text(product.seoDescription),
    specs: product.specs.map((spec) => ({ k: spec.k, v: spec.v })),
  };
}

/**
 * Тело запроса.
 *
 * Пустая строка превращается в `null`, а не уезжает пустой: «бренд не указан»
 * и «бренд — пустая строка» на сайте выглядят одинаково, но в разметке и в
 * фильтрах ведут себя по-разному.
 *
 * Пустой слаг не отправляется вовсе — сервер соберёт его из названия сам.
 */
export function toRequestBody(values: ProductFormValues): Record<string, unknown> {
  const optional = (value: string): string | null => (value.trim() === '' ? null : value.trim());

  return {
    name: values.name.trim(),
    badge: values.badge.trim(),
    areaMax: values.areaMax,
    priceNum: values.priceNum,
    tag: optional(values.tag),
    brand: optional(values.brand),
    sku: optional(values.sku),
    link: optional(values.link),
    sort: values.sort === '' ? 0 : values.sort,
    visible: values.visible,
    seoTitle: optional(values.seoTitle),
    seoDescription: optional(values.seoDescription),
    specs: values.specs
      // Полупустая пара — это забытая строка, а не характеристика: в таблицу
      // сравнения она попала бы пустой ячейкой во всех колонках.
      .filter((spec) => spec.k.trim() !== '' && spec.v.trim() !== '')
      .map((spec) => ({ k: spec.k.trim(), v: spec.v.trim() })),
    ...(values.slug.trim() === '' ? {} : { slug: values.slug.trim() }),
  };
}

type ApiError = { readonly message?: string; readonly field?: string };

function readError(payload: unknown): ApiError | undefined {
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
  values: ProductFormValues,
): Promise<ProductSaveResult> {
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

export function createProduct(values: ProductFormValues): Promise<ProductSaveResult> {
  return send('/api/admin/models', 'POST', values);
}

export function updateProduct(id: string, values: ProductFormValues): Promise<ProductSaveResult> {
  return send(`/api/admin/models/${id}`, 'PUT', values);
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/admin/models/${id}`, { method: 'DELETE' });
    if (response.ok) return { ok: true };
    if (response.status === 401) return { ok: false, message: texts.sessionError };
    return { ok: false, message: texts.serverError };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}

export { emptyProductValues };
