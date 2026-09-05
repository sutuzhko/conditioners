/** Публичный API форм настроек. */
export { SettingsForm, type SettingsFormProps } from './SettingsForm';
export { SettingsGroups, type SettingsGroupsProps } from './SettingsGroups';
export { GroupFields, type GroupFieldsProps } from './GroupFields';
export { ListField, type ListFieldProps } from './ListField';
export { ObjectListField, type ObjectListFieldProps, type ObjectRow } from './ObjectListField';
export { LEGAL_GROUP, NOTIFICATIONS_GROUP, SCHEDULE_GROUP, SETTINGS_GROUPS } from './fields';
export { settingsFormContent } from './content';
export {
  confirmGroupSwitch,
  filledFieldLabels,
  missingFieldLabels,
  minutesToTime,
  putGroup,
  readPath,
  timeToMinutes,
  toDateValue,
  toGroupValue,
  visibleFields,
  withoutHiddenFields,
  writePath,
  type ReadinessMark,
} from './lib';
export type {
  ColumnDescriptor,
  FieldCondition,
  FieldDescriptor,
  FieldKind,
  GroupDescriptor,
  GroupEntry,
  GroupValue,
  SaveGroup,
  SaveResult,
  SaveStatus,
} from './model';
