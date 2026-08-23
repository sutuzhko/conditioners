/** Публичный API оболочки панели управления. */
export { AdminShell, type AdminShellProps } from './AdminShell';
export { ADMIN_SECTIONS, adminShellContent, type AdminSection } from './content';
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
