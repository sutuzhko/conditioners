/** Публичный API оболочки панели управления. */
export { AdminShell, type AdminShellProps } from './AdminShell';
export {
  ADMIN_GROUP_TITLES,
  ADMIN_ROLE_TITLES,
  ADMIN_SECTIONS,
  ADMIN_SETTINGS_PATH,
  adminShellContent,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
  sectionAllows,
  sectionOf,
  sectionsFor,
  settingsSectionsFor,
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
  MonthSkeleton,
  RowsSkeleton,
  type FieldsSkeletonProps,
  type RowsSkeletonProps,
} from './skeletons';
