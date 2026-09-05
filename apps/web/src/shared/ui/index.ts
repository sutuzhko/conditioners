/**
 * Публичный API UI Kit. Виджеты и страницы импортируют компоненты отсюда,
 * а не из внутренних файлов: так путь остаётся стабильным при перекладке папок.
 */
export { Button, buttonClassName } from './Button/Button';
export type { ButtonProps, ButtonSize, ButtonVariant, ButtonAppearance } from './Button/Button';
export { ButtonLink } from './Button/ButtonLink';
export type { ButtonLinkHref, ButtonLinkProps } from './Button/ButtonLink';

export { IconButton } from './IconButton/IconButton';
export type { IconButtonProps, IconButtonSize, IconButtonVariant } from './IconButton/IconButton';

export { Chip } from './Chip/Chip';
export type { ChipProps } from './Chip/Chip';

export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';

export { BrandMark } from './BrandMark/BrandMark';
export type { BrandMarkProps, BrandMarkTone } from './BrandMark/BrandMark';

export { Badge } from './Badge/Badge';
export type { BadgeProps, BadgeVariant } from './Badge/Badge';

export { Alert } from './Alert/Alert';
export type { AlertProps, AlertTone } from './Alert/Alert';

export { Avatar, AvatarGroup } from './Avatar/Avatar';
export type { AvatarGroupProps, AvatarProps, AvatarSize } from './Avatar/Avatar';

export { Tooltip } from './Tooltip/Tooltip';
export type { TooltipPlacement, TooltipProps } from './Tooltip/Tooltip';

export { RowMenu } from './RowMenu/RowMenu';
export type { RowMenuItem, RowMenuProps } from './RowMenu/RowMenu';

export { CopyField } from './CopyField/CopyField';
export type { CopyFieldProps } from './CopyField/CopyField';

export { Chart } from './Chart/Chart';
export type { ChartProps, ChartSeries } from './Chart/Chart';

export { Card } from './Card/Card';
export type { CardElevation, CardPadding, CardProps, CardRadius, CardVariant } from './Card/Card';
export { CardBody, CardFooter, CardHeader } from './Card/CardBelt';
export type {
  CardBodyProps,
  CardFooterAlign,
  CardFooterProps,
  CardHeaderProps,
  CardHeadingLevel,
} from './Card/CardBelt';

export { FormSection } from './FormSection/FormSection';
export type {
  FormSectionGap,
  FormSectionLevel,
  FormSectionProps,
  FormSurface,
} from './FormSection/FormSection';

export { StatList } from './Stat/Stat';
export type { StatItem, StatListProps, StatTone } from './Stat/Stat';
export { StatTile, StatTiles } from './Stat/StatTile';
export type {
  StatDelta,
  StatDeltaTone,
  StatTileProps,
  StatTilesProps,
  StatTrend,
} from './Stat/StatTile';

export { EmptyState } from './EmptyState/EmptyState';
export type { EmptyStateProps } from './EmptyState/EmptyState';
export { ErrorState } from './ErrorState/ErrorState';
export type { ErrorStateProps } from './ErrorState/ErrorState';
export { Skeleton } from './Skeleton/Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton/Skeleton';

export { Input } from './Input/Input';
export type { InputProps } from './Input/Input';
export type { FieldVariant } from './internal/Field';
export { PhoneInput } from './Input/PhoneInput';
export type { PhoneInputProps } from './Input/PhoneInput';

export { Textarea } from './Textarea/Textarea';
export type { TextareaProps } from './Textarea/Textarea';

export { Select } from './Select/Select';
export type { SelectOption, SelectProps } from './Select/Select';

export { Checkbox } from './Checkbox/Checkbox';
export type { CheckboxProps } from './Checkbox/Checkbox';

export { RadioGroup } from './ChoiceGroup/RadioGroup';
export type { ChoiceOption, ChoiceOrientation, RadioGroupProps } from './ChoiceGroup/RadioGroup';
export { CheckboxGroup } from './ChoiceGroup/CheckboxGroup';
export type { CheckboxGroupProps } from './ChoiceGroup/CheckboxGroup';

export { Switch } from './Switch/Switch';
export type { SwitchProps, SwitchSize } from './Switch/Switch';

export { NumberInput } from './NumberInput/NumberInput';
export type { NumberInputProps } from './NumberInput/NumberInput';

export { DateField, EMPTY_DATE, dateSegmentsOf, isoOfDateSegments } from './DateField/DateField';
export type { DateFieldProps, DateSegmentKey, DateSegments } from './DateField/DateField';

export { Autocomplete } from './Autocomplete/Autocomplete';
export type { AutocompleteOption, AutocompleteProps } from './Autocomplete/Autocomplete';

export { RangeSlider } from './RangeSlider/RangeSlider';
export type { RangeSliderProps } from './RangeSlider/RangeSlider';

export { FileInput } from './FileInput/FileInput';
export type { FileInputProps } from './FileInput/FileInput';

export { Rating } from './Rating/Rating';
export type {
  RatingDisplayProps,
  RatingInputProps,
  RatingProps,
  RatingSize,
} from './Rating/Rating';

export { Pager } from './Pager/Pager';
export type { PagerProps } from './Pager/Pager';

export { Table } from './Table/Table';
export type { TableProps, TableVariant } from './Table/Table';
export { TableAction, TableActionLink, TableActions } from './Table/TableActions';
export type {
  TableActionLinkProps,
  TableActionProps,
  TableActionTone,
  TableActionsProps,
} from './Table/TableActions';

export { Accordion } from './Accordion/Accordion';
export type { AccordionItem, AccordionProps } from './Accordion/Accordion';

export { ConfirmDialog } from './ConfirmDialog/ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog/ConfirmDialog';
export { useConfirm } from './ConfirmDialog/useConfirm';
export type { ConfirmControl } from './ConfirmDialog/useConfirm';
export type { Confirm, ConfirmRequest } from './ConfirmDialog/model';

export { Modal } from './Modal/Modal';
export type { ModalProps, ModalSize } from './Modal/Modal';
export { RouteModal, useRouteClose } from './RouteModal/RouteModal';
export type { RouteModalProps, RouteClose, RouteCloseOptions } from './RouteModal/RouteModal';

export { Drawer } from './Drawer/Drawer';
export type { DrawerProps } from './Drawer/Drawer';

export { ThemeToggle } from './ThemeToggle/ThemeToggle';
export type { ThemeToggleProps } from './ThemeToggle/ThemeToggle';
export { ThemeSwitch } from './ThemeSwitch/ThemeSwitch';
export type { ThemeSwitchProps } from './ThemeSwitch/ThemeSwitch';
export { useTheme } from './lib/useTheme';
export type { Theme, ThemeControl } from './lib/useTheme';

export { SkipLink } from './SkipLink/SkipLink';
export type { SkipLinkProps } from './SkipLink/SkipLink';
