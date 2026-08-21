/**
 * Публичный API блока «Каталог». Страница импортирует отсюда и передаёт список
 * моделей пропсами — сам блок в базу не ходит (docs/ORCHESTRATION.md).
 */
export { Catalog } from './Catalog';
export { catalogText } from './content';
export type { CatalogProps } from './Catalog';
export type { CatalogProduct } from './model';
