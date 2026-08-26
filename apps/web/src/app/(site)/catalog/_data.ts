import { cache } from 'react';

import { productSchema, type Product } from '@/entities/product/model';
import { findVisibleBySlug, listVisible } from '@/server/repo/products';

/**
 * Чтение каталога для страниц раздела.
 *
 * `cache` из React — затем, что `generateMetadata` и сам компонент страницы
 * работают в одном проходе рендера и обоим нужны одни и те же данные:
 * каноникал страницы каталога зависит от числа найденных моделей, а описание
 * страницы модели — от её действующей цены. Без кеша это был бы второй
 * одинаковый запрос в базу на каждый переход по фильтру.
 *
 * Репозиторий отдаёт DTO контракта (даты строками) — доменный тип получается
 * разбором схемы, как и на остальных страницах.
 */
export const loadCatalog = cache(async (): Promise<readonly Product[]> => {
  const rows = await listVisible();
  return rows.map((dto) => productSchema.parse(dto));
});

/** Модель по адресу. `null` — такой модели нет или она снята с продажи. */
export const loadProduct = cache(async (slug: string): Promise<Product | null> => {
  const row = await findVisibleBySlug(slug);
  return row === null ? null : productSchema.parse(row);
});
