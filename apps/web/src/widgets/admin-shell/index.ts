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
  type AdminSummaryProps,
  type ReadinessSummary,
  type SummaryCounts,
  type UpcomingItem,
  type UpcomingNature,
} from './AdminSummary';
export { adminSummaryContent } from './summary-content';
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
