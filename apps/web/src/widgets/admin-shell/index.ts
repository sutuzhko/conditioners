/** Публичный API оболочки панели управления. */
export { AdminShell, type AdminShellProps } from './AdminShell';
export { AdminTabs, type AdminTabsProps } from './AdminTabs';
export {
  ADMIN_GROUP_TITLES,
  ADMIN_ROLE_TITLES,
  ADMIN_SECTIONS,
  ADMIN_SETTINGS_PATH,
  ADMIN_TABS,
  adminShellContent,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
  sectionAllows,
  sectionOf,
  sectionsFor,
  settingsSectionsFor,
  blockErrorContent,
  blockErrorNote,
  type AdminSection,
  type AdminSectionGroup,
  type AdminSectionPlace,
} from './content';
export {
  AdminSummary,
  segmentHref,
  type AdminSummaryProps,
  type AttentionItem,
  type AttentionReason,
  type MoneyShare,
  type MoneySummary,
  type ReadinessSummary,
  type SummaryCharts,
  type SummaryCounts,
  type SummaryData,
  type SummaryHead,
  type SummarySegment,
  type SummarySeries,
  type SummaryUpcoming,
  type UpcomingItem,
  type UpcomingNature,
  type WorkCounts,
} from './AdminSummary';
export { SummaryFilters, type SummaryFiltersProps } from './SummaryFilters';
export { SummaryTable, type SummaryHref, type SummaryTableProps } from './SummaryTable';
export {
  adminSummaryContent,
  dayPartOf,
  dayShort,
  dayTitle,
  type DayPart,
} from './summary-content';
export {
  DEFAULT_UPCOMING_FILTERS,
  SUMMARY_PATH,
  UPCOMING_COLUMNS,
  UPCOMING_PAGE_SIZE,
  UPCOMING_PARAMS,
  UPCOMING_SHOWS,
  UPCOMING_SORTS,
  isUpcomingColumn,
  isUpcomingShow,
  isUpcomingSort,
  toggledColumns,
  upcomingColumnLocked,
  upcomingFiltersFromParams,
  upcomingHref,
  upcomingQuery,
  upcomingReset,
  visibleUpcomingColumns,
  type UpcomingColumn,
  type UpcomingFilters,
  type UpcomingShow,
  type UpcomingSort,
} from './summary-list';
export { overviewDeltas, type SummaryDeltas, type TileInput } from './summary-tiles';
export { NAV_COOKIE } from './navCookie';
export {
  FieldsSkeleton,
  HeadSkeleton,
  LineSkeleton,
  MonthSkeleton,
  RowsSkeleton,
  type FieldsSkeletonProps,
  type HeadSkeletonProps,
  type LineSkeletonProps,
  type RowsSkeletonProps,
} from './skeletons';
export { AdminSummarySkeleton } from './AdminSummarySkeleton';
export {
  DataBlock,
  BlockError,
  type BlockSurface,
  type DataBlockProps,
  type BlockErrorProps,
} from './DataBlock';
export { SectionError, type SectionErrorProps } from './SectionError';
