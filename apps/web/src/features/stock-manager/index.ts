/** Публичный API раздела склада. */
export { StockCell, type StockCellProps } from './StockCell';
export {
  StockCreateModal,
  type StockCreateModalProps,
  type StockCreation,
} from './StockCreateModal';
export { StockFilters, type StockFiltersProps } from './StockFilters';
export { StockItemForm, type StockItemFormProps } from './StockItemForm';
export { StockJournal, type StockJournalProps } from './StockJournal';
export { StockMoveForm, type StockMoveFormProps } from './StockMoveForm';
export {
  StockMoveScope,
  useStockMove,
  type StockGrab,
  type StockMoveControl,
} from './StockMoveScope';
export { StockTable, type StockTableProps } from './StockTable';
export { StockZoneForm, type StockZoneFormProps } from './StockZoneForm';
export { StockZones, type StockZonesProps } from './StockZones';
export {
  STOCK_MOVE_TITLES,
  STOCK_TAB_TITLES,
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
  DEFAULT_STOCK_TAB,
  STOCK_ITEM_NEW_PATH,
  STOCK_JOURNAL_PATH,
  STOCK_MOVE_PATH,
  STOCK_PATH,
  STOCK_ZONES_PATH,
  STOCK_TABS,
  STOCK_ZONE_NEW_PATH,
  itemDraftOf,
  itemRefOf,
  lowFromParam,
  moveDraftOf,
  pageNumber,
  stockItemPath,
  stockMovePath,
  stockMoveQuery,
  stockTabFromParam,
  stockTabHref,
  type StockApi,
  type StockFilterState,
  type StockItemCard,
  type StockItemDraft,
  type StockItemProduct,
  type StockItemRef,
  type StockMoveDraft,
  type StockMoveHref,
  type StockMovePreset,
  type StockMovementCard,
  type StockMovementPage,
  type StockOverview,
  type StockResult,
  type StockTab,
  type StockZoneCard,
  type StockZonePerson,
} from './model';
