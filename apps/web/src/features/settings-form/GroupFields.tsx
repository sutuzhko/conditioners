'use client';

import { Checkbox, Input, Select, Textarea } from '@/shared/ui';

import { ListField } from './ListField';
import { ObjectListField, type ObjectRow } from './ObjectListField';
import { minutesToTime, readPath, timeToMinutes, toDateValue, visibleFields } from './lib';
import type { FieldDescriptor, GroupDescriptor, GroupValue } from './model';
import styles from './SettingsForm.module.css';

/** Строка из значения любого типа: в поле ввода попадает текст, а не `null`. */
function asText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

function asList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(asText) : [];
}

/**
 * Минуты дня из значения группы. Всё, что не целым числом минут в сутках, —
 * пустое поле: рабочее окно могло быть сохранено до появления поля, а
 * показывать мусор временем нельзя.
 */
function asMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value >= 0 && value <= 24 * 60 ? value : null;
}

/** Строки списка объектов: всё, что не объект, отбрасывается как мусор. */
function asObjectList(value: unknown): readonly ObjectRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ObjectRow => typeof item === 'object' && item !== null && !Array.isArray(item),
  );
}

/**
 * Ключ строки формы. Путь повторяется у полей разных вариантов состава
 * («Наименование» у предпринимателя и у общества), поэтому в ключ входит и
 * условие показа: одновременно видно только одно из таких полей, но ключ
 * обязан быть своим у каждого.
 */
function fieldKey(field: FieldDescriptor): string {
  return field.when === undefined ? field.path : `${field.path}@${field.when.equals.join('|')}`;
}

export interface GroupFieldsProps {
  readonly group: GroupDescriptor;
  /** Текущий черновик группы: что показано на экране, то и уйдёт на сервер. */
  readonly draft: GroupValue;
  readonly fieldErrors: Record<string, string>;
  readonly disabled: boolean;
  readonly onChange: (path: string, next: unknown) => void;
  /**
   * Смена значения, от которого зависит состав группы. Отдельно от обычной
   * правки: сперва вопрос о потерянном, потом очистка (ADR-112, ADR-113).
   */
  readonly onSwitch: (field: FieldDescriptor, next: unknown) => void;
}

/**
 * Поля одной группы настроек.
 *
 * 🔴 Отдельно от формы, потому что форм две: страница «Уведомления» правит
 * одну группу своей кнопкой, страница «Компания» — тринадцать групп одной
 * (issue #617). Раскладка полей, разбор значений и подтверждение смены состава
 * у них общие, и второй их копии в проекте быть не должно.
 */
export function GroupFields({
  group,
  draft,
  fieldErrors,
  disabled,
  onChange,
  onSwitch,
}: GroupFieldsProps) {
  /* Состав группы зависит от её собственного значения: у предпринимателя и у
     общества разные реквизиты (ADR-112). Поля вне текущего состава не
     рисуются и не уходят на сервер. */
  const fields = visibleFields(group, draft);

  return (
    <div
      className={[styles.fields, group.layout === 'pairs' ? styles.pairs : null]
        .filter(Boolean)
        .join(' ')}
    >
      {fields.map((field) => (
        <Field
          key={fieldKey(field)}
          field={field}
          value={readPath(draft, field.path)}
          error={fieldErrors[field.path]}
          disabled={disabled}
          onChange={(next) => {
            /* Поле, задающее состав группы, меняется не как остальные:
               сначала вопрос, потом очистка. */
            if (field.resetsGroup === true) {
              onSwitch(field, next);
              return;
            }

            onChange(field.path, next);
          }}
        />
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  error: string | undefined;
  disabled: boolean;
  onChange: (next: unknown) => void;
}) {
  const shared = {
    label: field.label,
    hint: field.hint,
    error: error === '' ? undefined : error,
    disabled,
    /* Поле-предложение занимает ряд целиком: в трети ряда значение уезжало
       за край без переноса (issue #37). */
    ...(field.fullRow === true ? { wrapperClassName: styles.wide } : {}),
  };

  if (field.kind === 'list') {
    return (
      <ListField
        label={field.label}
        itemLabel={field.itemLabel ?? field.label}
        hint={field.hint}
        mask={field.mask}
        values={asList(value)}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (field.kind === 'objectList') {
    return (
      <ObjectListField
        label={field.label}
        itemLabel={field.itemLabel ?? field.label}
        hint={field.hint}
        columns={field.columns ?? []}
        values={asObjectList(value)}
        maxItems={field.maxItems}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (field.kind === 'checkbox') {
    return (
      <Checkbox
        label={field.label}
        hint={field.hint}
        checked={value === true}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (field.kind === 'select') {
    return (
      <Select
        {...shared}
        options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
        value={asText(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.kind === 'longText') {
    return (
      <Textarea
        {...shared}
        rows={3}
        wrapperClassName={styles.wide}
        value={asText(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.kind === 'time') {
    const minutes = asMinutes(value);

    return (
      <Input
        {...shared}
        type="time"
        value={minutes === null ? '' : minutesToTime(minutes)}
        onChange={(event) => {
          /* Очищенное поле — не полночь: ключ уходит из тела запроса, и
             сервер подставляет умолчание из схемы. Ноль означал бы, что
             владелец сам открыл календарь с нуля часов. */
          onChange(timeToMinutes(event.target.value) ?? undefined);
        }}
      />
    );
  }

  if (field.kind === 'date') {
    return (
      <Input
        {...shared}
        type="date"
        value={toDateValue(value)}
        onChange={(event) => {
          /* Очищенное поле — не «первое января»: ключ уходит из тела запроса,
             и сервер подставляет умолчание схемы (ADR-139). */
          onChange(event.target.value === '' ? undefined : event.target.value);
        }}
      />
    );
  }

  if (field.kind === 'number') {
    return (
      <Input
        {...shared}
        type="number"
        value={asText(value)}
        onChange={(event) => {
          /* Пустое поле — это `null`, а не ноль: незаполненный год основания
             и «основана в нулевом году» — разные утверждения. */
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    );
  }

  return (
    <Input {...shared} value={asText(value)} onChange={(event) => onChange(event.target.value)} />
  );
}
