/** Публичный API форм настроек. */
export { SettingsForm, type SettingsFormProps } from './SettingsForm';
export { ListField, type ListFieldProps } from './ListField';
export { ObjectListField, type ObjectListFieldProps, type ObjectRow } from './ObjectListField';
export { LEGAL_GROUP, NOTIFICATIONS_GROUP, SCHEDULE_GROUP, SETTINGS_GROUPS } from './fields';
export { settingsFormContent } from './content';
export {
  filledFieldLabels,
  minutesToTime,
  putGroup,
  readPath,
  timeToMinutes,
  toDateValue,
  toGroupValue,
  visibleFields,
  withoutHiddenFields,
  writePath,
} from './lib';
export type {
  ColumnDescriptor,
  FieldCondition,
  FieldDescriptor,
  FieldKind,
  GroupDescriptor,
  GroupValue,
  SaveGroup,
  SaveResult,
  SaveStatus,
} from './model';
