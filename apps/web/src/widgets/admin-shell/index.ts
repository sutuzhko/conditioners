/** Публичный API оболочки панели управления. */
export { AdminShell, type AdminShellProps } from './AdminShell';
export {
  ADMIN_GROUP_TITLES,
  ADMIN_SECTIONS,
  adminShellContent,
  sectionAllows,
  sectionOf,
  sectionsFor,
  type AdminSection,
  type AdminSectionGroup,
} from './content';
export {
  AdminSummary,
  type AdminSummaryProps,
  type ReadinessSummary,
  type SummaryCounts,
  type UpcomingEvent,
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
