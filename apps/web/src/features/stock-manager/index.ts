/** Публичный API раздела склада. */
export { StockFilters, type StockFiltersProps } from './StockFilters';
export { StockItemAdd, type StockItemAddProps } from './StockItemAdd';
export { StockItemForm, type StockItemFormProps } from './StockItemForm';
export { StockJournal, type StockJournalProps } from './StockJournal';
export { StockMoveForm, type StockMoveFormProps } from './StockMoveForm';
export { StockTable, type StockTableProps } from './StockTable';
export { StockZoneForm, type StockZoneFormProps } from './StockZoneForm';
export { StockZones, type StockZonesProps } from './StockZones';
export {
  STOCK_MOVE_TITLES,
  STOCK_UNIT_FULL,
  STOCK_UNIT_TITLES,
  STOCK_ZONE_KIND_TITLES,
  formatQty,
  stockManagerContent,
} from './content';
export { stockApi } from './lib';
export {
  ADMIN_PAGE_SIZE,
  DEFAULT_STOCK_FILTERS,
  STOCK_PATH,
  STOCK_ZONES_PATH,
  itemDraftOf,
  itemRefOf,
  lowFromParam,
  pageNumber,
  stockItemPath,
  type StockApi,
  type StockFilterState,
  type StockItemCard,
  type StockItemDraft,
  type StockItemProduct,
  type StockItemRef,
  type StockMovementCard,
  type StockMovementPage,
  type StockOverview,
  type StockResult,
  type StockZoneCard,
  type StockZonePerson,
} from './model';
