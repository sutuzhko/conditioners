/**
 * Публичный API блока «Каталог». Страница импортирует отсюда и передаёт список
 * моделей пропсами — сам блок в базу не ходит (docs/ORCHESTRATION.md).
 *
 * Три представления одних и тех же данных: витрина лендинга (`Catalog`),
 * страница каталога с подбором (`CatalogList`) и страница модели
 * (`ProductDetails`) — ADR-109.
 */
export { Catalog } from './Catalog';
export { CatalogList } from './CatalogList';
export { ProductDetails } from './ProductDetails';
export { catalogListText, catalogText, productPageText } from './content';
export type { CatalogProps } from './Catalog';
export type { CatalogListProps } from './CatalogList';
export type { ProductDetailsProps } from './ProductDetails';
export { COMPARE_ANCHOR } from './model';
export type { CatalogProduct, ProductHref } from './model';
