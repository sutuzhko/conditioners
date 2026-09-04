/** Приведение модели к форме и обратно, отправка — контракт docs/API.md §3. */
import type { Product } from '@/entities/product/model';
import { adminRequest, createdSchema, jsonInit } from '@/shared/lib/api';

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
    featured: product.featured,
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
    // не знает про витрину — не трогает её: см. `featured` в модели формы
    ...(values.featured === undefined ? {} : { featured: values.featured }),
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

/* Общий разбор ответа (ADR-030): фича оставляет только свои формулировки. */
const FORM_TEXTS = {
  network: texts.networkError,
  server: texts.serverError,
  session: texts.sessionError,
};

async function send(
  url: string,
  method: 'POST' | 'PUT',
  values: ProductFormValues,
): Promise<ProductSaveResult> {
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

export function createProduct(values: ProductFormValues): Promise<ProductSaveResult> {
  return send('/api/admin/models', 'POST', values);
}

export function updateProduct(id: string, values: ProductFormValues): Promise<ProductSaveResult> {
  return send(`/api/admin/models/${id}`, 'PUT', values);
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await adminRequest(`/api/admin/models/${id}`, { method: 'DELETE' }, FORM_TEXTS);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

export { emptyProductValues };

/**
 * Видимость модели из списка каталога — `PATCH`, а не `PUT`.
 *
 * 🔴 Частичное тело намеренно: полное обновление отправило бы вместе с флагом
 * весь снимок модели, каким его знает список, — а список знает восемь полей из
 * тридцати. Скидка, характеристики и фотографии, которых в нём нет, ушли бы на
 * сервер пустыми.
 */
export async function setProductVisible(
  id: string,
  visible: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const result = await adminRequest(
    `/api/admin/models/${id}`,
    jsonInit('PATCH', { visible }),
    FORM_TEXTS,
  );

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
