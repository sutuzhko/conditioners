/** Публичный API форм настроек. */
export { SettingsForm, type SettingsFormProps } from './SettingsForm';
export { ListField, type ListFieldProps } from './ListField';
export { ObjectListField, type ObjectListFieldProps, type ObjectRow } from './ObjectListField';
export { NOTIFICATIONS_GROUP, SETTINGS_GROUPS } from './fields';
export { settingsFormContent } from './content';
export { putGroup, readPath, writePath } from './lib';
export type {
  ColumnDescriptor,
  FieldDescriptor,
  FieldKind,
  GroupDescriptor,
  GroupValue,
  SaveGroup,
  SaveResult,
  SaveStatus,
} from './model';
