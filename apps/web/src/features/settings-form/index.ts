/** Публичный API форм настроек. */
export { SettingsForm, type SettingsFormProps } from './SettingsForm';
export { ListField, type ListFieldProps } from './ListField';
export { SETTINGS_GROUPS } from './fields';
export { settingsFormContent } from './content';
export { putGroup, readPath, writePath } from './lib';
export type {
  FieldDescriptor,
  FieldKind,
  GroupDescriptor,
  GroupValue,
  SaveGroup,
  SaveResult,
  SaveStatus,
} from './model';
