import type { Product, ProductPhoto } from '@/entities/product/model';

/**
 * Что каталогу нужно от товара.
 *
 * Не весь `Product`: `seoTitle`/`seoDescription` читает страница модели, а не
 * витрина. Тип собран через `Pick`, как `SalePricing` и `ComparableProduct` в
 * домене, — тогда фикстуре в Storybook не приходится выдумывать поля, которые
 * блок всё равно не рисует.
 */
export type CatalogProduct = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'badge'
  | 'name'
  | 'areaMax'
  | 'tag'
  | 'priceNum'
  | 'salePrice'
  | 'saleFrom'
  | 'saleTo'
  | 'saleLabel'
  | 'link'
  | 'visible'
  | 'photos'
  | 'specs'
>;

/**
 * Главная фотография: явно отмеченная владельцем, иначе первая по порядку.
 * `null` — фото нет, и карточка рисует заглушку с классом мощности
 * (docs/DESIGN_BRIEF.md §8). Это рабочее состояние: в сидах фото нет ни у
 * одной модели.
 */
export function mainPhoto(photos: readonly ProductPhoto[]): ProductPhoto | null {
  const marked = photos.find((photo) => photo.isMain);
  if (marked !== undefined) return marked;

  const [first] = [...photos].sort((a, b) => a.sort - b.sort);
  return first ?? null;
}
