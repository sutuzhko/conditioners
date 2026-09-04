'use client';

import { Button, Input } from '@/shared/ui';

import { settingsFormContent as texts } from './content';
import type { ColumnDescriptor } from './model';
import styles from './SettingsForm.module.css';

/** Строка списка объектов: значения по ключам колонок. */
export type ObjectRow = Record<string, unknown>;

export interface ObjectListFieldProps {
  readonly label: string;
  readonly itemLabel: string;
  readonly hint?: string | undefined;
  readonly columns: readonly ColumnDescriptor[];
  readonly values: readonly ObjectRow[];
  readonly maxItems?: number | undefined;
  readonly disabled: boolean;
  readonly onChange: (next: readonly ObjectRow[]) => void;
}

function asText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Список объектов: цифры первого экрана и всё, что состоит не из одной
 * строки, а из нескольких полей.
 *
 * Предел числа строк приходит из схемы: она разрешает не больше четырёх
 * цифр — полоса на пятой перестаёт помещаться в ряд. Кнопка добавления
 * исчезает на пределе, а не отвечает ошибкой после отправки.
 */
export function ObjectListField({
  label,
  itemLabel,
  hint,
  columns,
  values,
  maxItems,
  disabled,
  onChange,
}: ObjectListFieldProps) {
  const replace = (index: number, key: string, value: unknown): void => {
    onChange(values.map((row, at) => (at === index ? { ...row, [key]: value } : row)));
  };

  const blankRow: ObjectRow = Object.fromEntries(
    columns.map((column) => [column.key, column.kind === 'number' ? 0 : '']),
  );

  const full = maxItems !== undefined && values.length >= maxItems;

  return (
    <fieldset className={styles.list} disabled={disabled}>
      <legend className={styles.listLabel}>{label}</legend>
      {hint === undefined ? null : <p className={styles.listHint}>{hint}</p>}

      {values.length === 0 ? <p className={styles.empty}>{texts.listEmpty}</p> : null}

      {values.map((row, index) => (
        // Индекс как ключ: строки не переупорядочиваются, а различить две
        // пустые больше нечем.
        <div className={styles.objectRow} key={index}>
          {columns.map((column) => (
            /* 🔴 Доля ширины стоит на ячейке ряда, а не на самом поле ввода
               (issue #37): внутри поля она ничего не делила, и подпись цифры
               («Довольных клиентов») занимала 209px в поле 28px. */
            <span
              className={styles.objectCell}
              key={column.key}
              style={{ flexGrow: column.grow ?? 1 }}
            >
              <Input
                // Подпись уникальна на строку: диктор иначе читает четыре
                // одинаковых «Число» подряд.
                aria-label={`${column.label}: ${itemLabel.toLowerCase()} ${index + 1}`}
                placeholder={column.label}
                type={column.kind === 'number' ? 'number' : 'text'}
                value={asText(row[column.key])}
                wrapperClassName={styles.objectInput}
                onChange={(event) =>
                  replace(
                    index,
                    column.key,
                    column.kind === 'number'
                      ? event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                      : event.target.value,
                  )
                }
              />
            </span>
          ))}

          <Button
            type="button"
            variant="light"
            size="sm"
            className={styles.remove}
            aria-label={texts.removeItem(itemLabel, index + 1)}
            onClick={() => onChange(values.filter((_, at) => at !== index))}
          >
            {texts.remove}
          </Button>
        </div>
      ))}

      {full ? (
        <p className={styles.listHint}>{texts.listFull(maxItems ?? 0)}</p>
      ) : (
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => onChange([...values, blankRow])}
        >
          {texts.addItem(itemLabel)}
        </Button>
      )}
    </fieldset>
  );
}
