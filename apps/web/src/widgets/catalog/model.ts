import type { ButtonLinkHref } from '@/shared/ui';
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
  // порядок владельца: по нему идёт выдача каталога и собираются значения
  // фильтров — блоку он нужен затем же, зачем и странице (ADR-109)
  | 'sort'
  | 'photos'
  | 'specs'
>;

/**
 * Адрес страницы модели по её слагу.
 *
 * Функцией из страницы, а не строкой внутри блока: карта URL принадлежит
 * маршрутам (`shared/seo/routes`), а блок обязан рисоваться в Storybook, где
 * маршрутизации нет вовсе.
 */
export type ProductHref = (slug: string) => ButtonLinkHref;

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
