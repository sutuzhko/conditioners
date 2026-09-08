/** Публичный API раздела команды. */
export { InstallerNotes, type InstallerNotesProps } from './InstallerNotes';
export { StaffAccountForm, type StaffAccountFormProps } from './StaffAccountForm';
export { StaffLoadBar, type StaffLoadBarProps } from './StaffLoadBar';
export { StaffRow, type StaffRowProps } from './StaffRow';
export { StaffSearch, type StaffSearchProps } from './StaffSearch';
export { StaffCreateForm, type StaffCreateFormProps } from './StaffCreateForm';
export { StaffCreateModal, type StaffCreateModalProps } from './StaffCreateModal';
export { StaffDangerZone, type StaffDangerZoneProps } from './StaffDangerZone';
export { StaffOrders, type StaffOrdersProps } from './StaffOrders';
export { StaffPayouts, type StaffPayoutsProps } from './StaffPayouts';
export { StaffPermissions, type StaffPermissionsProps } from './StaffPermissions';
export { StaffList, type StaffListProps } from './StaffList';
export { STAFF_TAB_TITLES, staffManagerContent } from './content';
export { staffApi } from './lib';
export {
  ADMIN_PERMISSION_HINTS,
  ADMIN_PERMISSION_TITLES,
  DANGEROUS_PERMISSIONS,
  PANEL_SECTION_PERMISSIONS,
  STAFF_CARD_TABS,
  TEAM_NEW_PATH,
  TEAM_PATH,
  staffCardTabFromParam,
  staffTitle,
  type AdminPermission,
  type AdminRole,
  type InstallerNoteCard,
  type StaffApi,
  type StaffCard,
  type StaffCardTab,
  type StaffDetails,
  type StaffOrder,
  type StaffOrders as StaffOrdersData,
  type StaffResult,
  type StaffRowStats,
  type StaffTotals,
} from './model';
