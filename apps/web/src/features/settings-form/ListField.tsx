'use client';

import { Button, Input, PhoneInput } from '@/shared/ui';

import { settingsFormContent as texts } from './content';
import styles from './SettingsForm.module.css';

export interface ListFieldProps {
  readonly label: string;
  readonly itemLabel: string;
  readonly hint?: string | undefined;
  /** Маска ввода строки: телефон набирают одинаково и на сайте, и в админке. */
  readonly mask?: 'phone' | undefined;
  readonly values: readonly string[];
  readonly disabled: boolean;
  readonly onChange: (next: readonly string[]) => void;
}

/**
 * Список строк: телефоны, часы работы для разметки, ссылки на соцсети.
 *
 * Строки удаляются и добавляются по одной. Порядок значим — первый телефон
 * показывается в шапке, — поэтому новая строка встаёт в конец, а не наверх.
 */
export function ListField({
  label,
  itemLabel,
  hint,
  mask,
  values,
  disabled,
  onChange,
}: ListFieldProps) {
  const replace = (index: number, value: string): void => {
    onChange(values.map((item, at) => (at === index ? value : item)));
  };

  const remove = (index: number): void => {
    onChange(values.filter((_, at) => at !== index));
  };

  return (
    <fieldset className={styles.list} disabled={disabled}>
      <legend className={styles.listLabel}>{label}</legend>
      {hint === undefined ? null : <p className={styles.listHint}>{hint}</p>}

      {values.length === 0 ? <p className={styles.empty}>{texts.listEmpty}</p> : null}

      {values.map((value, index) => (
        // Индекс как ключ здесь корректен: строки не переупорядочиваются, а
        // одинаковые значения (две пустые строки) различить больше нечем.
        <div className={styles.listRow} key={index}>
          {mask === 'phone' ? (
            <PhoneInput
              aria-label={`${itemLabel} ${index + 1}`}
              value={value}
              wrapperClassName={styles.listInput}
              onChange={(next) => replace(index, next)}
            />
          ) : (
            <Input
              aria-label={`${itemLabel} ${index + 1}`}
              value={value}
              wrapperClassName={styles.listInput}
              onChange={(event) => replace(index, event.target.value)}
            />
          )}
          {/* Подпись кнопки полная и уникальная («Удалить телефон 2»): экранный
              диктор читает список одинаковых «Удалить» без всякой пользы. */}
          <Button
            type="button"
            variant="light"
            size="sm"
            className={styles.remove}
            aria-label={texts.removeItem(itemLabel, index + 1)}
            onClick={() => remove(index)}
          >
            {texts.remove}
          </Button>
        </div>
      ))}

      <Button type="button" variant="bordered" size="sm" onClick={() => onChange([...values, ''])}>
        {texts.addItem(itemLabel)}
      </Button>
    </fieldset>
  );
}
