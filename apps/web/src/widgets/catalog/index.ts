/**
 * Публичный API блока «Каталог». Страница импортирует отсюда и передаёт список
 * моделей пропсами — сам блок в базу не ходит (docs/ORCHESTRATION.md).
 *
 * Четыре представления одних и тех же данных: витрина лендинга (`Catalog`),
 * страница каталога с подбором (`CatalogList`), страница сравнения
 * (`CatalogCompare`) и страница модели (`ProductDetails`) — ADR-109, ADR-121.
 */
export { Catalog } from './Catalog';
export { CatalogCompare } from './CatalogCompare';
export { CatalogList } from './CatalogList';
export { ProductDetails } from './ProductDetails';
export { catalogListText, catalogText, productPageText } from './content';
export type { CatalogProps } from './Catalog';
export type { CatalogCompareProps } from './CatalogCompare';
export type { CatalogListProps } from './CatalogList';
export type { ProductDetailsProps } from './ProductDetails';
export { COMPARE_ANCHOR, similarProducts } from './model';
export type { CatalogProduct, ProductHref } from './model';

/**
 * Скелетоны перехода. Отдельно от блоков: их зовёт `loading.tsx` маршрута, а
 * не страница, и данных они не принимают вовсе.
 */
export { CatalogCompareSkeleton } from './CatalogCompareSkeleton';
export { CatalogListSkeleton } from './CatalogListSkeleton';
export { ProductDetailsSkeleton } from './ProductDetailsSkeleton';
