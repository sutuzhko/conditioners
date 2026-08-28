'use client';

import { useId, useState, type FormEvent } from 'react';

import { Button, Card, Checkbox, Input, Select, Textarea, useConfirm } from '@/shared/ui';

import { ListField } from './ListField';
import { ObjectListField, type ObjectRow } from './ObjectListField';
import { settingsFormContent as texts } from './content';
import {
  filledFieldLabels,
  minutesToTime,
  putGroup,
  readPath,
  timeToMinutes,
  toDateValue,
  visibleFields,
  withoutHiddenFields,
  writePath,
} from './lib';
import type { FieldDescriptor, GroupDescriptor, GroupValue, SaveGroup, SaveStatus } from './model';
import styles from './SettingsForm.module.css';

export interface SettingsFormProps {
  readonly group: GroupDescriptor;
  /** Текущее значение группы из базы. Пустой объект — группа ещё не сохранялась. */
  readonly value: GroupValue;
  /** Отправка. Подменяется в историях и тестах; по умолчанию — PUT /api/admin/settings/{key}. */
  readonly save?: SaveGroup | undefined;
}

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

/**
 * Форма одной группы настроек.
 *
 * Группа сохраняется целиком и отдельно от соседних: контракт — `PUT` на
 * группу (docs/API.md §5), и владелец, правящий телефон, не должен ждать,
 * пока он допишет условия гарантии.
 *
 * Проверка значений остаётся на сервере: схема Zod там одна и та же для формы
 * и для API, дублировать её здесь — значит однажды разойтись с ней.
 */
export function SettingsForm({ group, value, save = putGroup }: SettingsFormProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<GroupValue>(value);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /* Подтверждение необратимой правки — общий диалог кита, а не окно
     браузера: системное окно нельзя объяснить (ADR-113). */
  const { confirm, dialog } = useConfirm();

  const sending = status === 'sending';
  /* Состав группы зависит от её собственного значения: у предпринимателя и у
     общества разные реквизиты (ADR-112). Поля вне текущего состава не
     рисуются и не уходят на сервер. */
  const fields = visibleFields(group, draft);
  /* Сравнение по JSON, а не по ссылкам: значения — простые деревья из строк,
     чисел и флажков, и глубокого сравнения руками они не стоят. */
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  const set = (path: string, next: unknown): void => {
    setDraft((prev) => writePath(prev, path, next));
    setStatus('idle');
    setFieldErrors((prev) => (prev[path] === undefined ? prev : { ...prev, [path]: '' }));
  };

  /**
   * Смена значения, от которого зависит состав группы.
   *
   * 🔴 Стирается вся группа, а не только ушедшие с экрана поля: одноимённые
   * поля у разных вариантов означают разное, и молчаливый перенос значения
   * опубликовал бы не то, что владелец вводил (ADR-112). Очистка происходит
   * сразу — что показано на экране, то и уйдёт на сервер.
   */
  const switchGroup = async (field: FieldDescriptor, next: unknown): Promise<void> => {
    const losing = filledFieldLabels(group, draft, field.path);

    // терять нечего — вопрос был бы лишним
    if (losing.length > 0) {
      const confirmed = await confirm({
        title: texts.resetTitle(group.title),
        description: texts.resetDescription(losing),
        confirmLabel: texts.resetConfirm,
        cancelLabel: texts.resetCancel,
      });

      /* Отказ не меняет ничего: черновик не тронут, и переключатель
         возвращается на прежнее значение сам — он управляемый. */
      if (!confirmed) return;
    }

    setDraft(writePath({}, field.path, next));
    setStatus('idle');
    setMessage('');
    setFieldErrors({});
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');
    setFieldErrors({});

    const result = await save(group.key, withoutHiddenFields(group, draft));

    if (result.ok) {
      setStatus('success');
      return;
    }

    setStatus('error');
    setMessage(result.message);
    setFieldErrors(result.fieldErrors ?? {});
  };

  return (
    <Card as="section" className={styles.card} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        {group.title}
      </h2>
      <p className={styles.description}>{group.description}</p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.fields}>
          {fields.map((field) => (
            <Field
              key={fieldKey(field)}
              field={field}
              value={readPath(draft, field.path)}
              error={fieldErrors[field.path]}
              disabled={sending}
              onChange={(next) => {
                /* Поле, задающее состав группы, меняется не как остальные:
                   сначала вопрос, потом очистка. */
                if (field.resetsGroup === true) {
                  void switchGroup(field, next);
                  return;
                }

                set(field.path, next);
              }}
            />
          ))}
        </div>

        {/* Сообщение над кнопкой — только когда его негде показать у поля:
            сервер не назвал поле или отказ вообще не про значения (истёкшая
            сессия, недоступная сеть). Иначе один и тот же текст читался бы
            диктором дважды. */}
        {message !== '' && Object.keys(fieldErrors).length === 0 ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" loading={sending} disabled={!dirty && status !== 'error'}>
            {sending ? texts.saving : texts.save}
          </Button>

          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              disabled={sending}
              onClick={() => {
                setDraft(value);
                setStatus('idle');
                setMessage('');
                setFieldErrors({});
              }}
            >
              {texts.discard}
            </Button>
          ) : null}

          {/* Успех озвучивается вежливо: сохранение — не ошибка, перебивать
              чтение формы им не нужно. */}
          {status === 'success' ? (
            <p className={styles.saved} role="status">
              {texts.saved}. {group.savedNote ?? texts.savedNote}
            </p>
          ) : null}
        </div>
      </form>

      {/* Окно живёт вне формы: кнопки подтверждения не имеют отношения к
          отправке группы. */}
      {dialog}
    </Card>
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
        rows={4}
        className={styles.wide}
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
