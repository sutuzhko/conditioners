'use client';

import type { ReactNode } from 'react';

import fieldStyles from '../internal/Field.module.css';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './ChoiceGroup.module.css';

export interface ChoiceOption {
  readonly value: string;
  readonly label: ReactNode;
  /** Пояснение под подписью: чем этот способ оплаты отличается от соседнего. */
  readonly description?: string | undefined;
  readonly disabled?: boolean | undefined;
}

export type ChoiceOrientation = 'vertical' | 'horizontal';

export interface RadioGroupProps {
  /** Подпись группы. Становится `<legend>` — у группы имя одно на всех. */
  readonly label: string;
  readonly name: string;
  readonly options: readonly ChoiceOption[];
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly orientation?: ChoiceOrientation | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Группа радио: способ оплаты, тип работы (issue #331).
 *
 * 🔴 `<fieldset>` с `<legend>`, а не `<div>` с подписью сверху. Без группы
 * озвучка читает каждую кнопку отдельно — «наличные, переключатель» — и не
 * говорит, к какому вопросу это ответ. Единственный способ дать группе имя в
 * HTML — `legend`, и он обязан лежать прямо в `fieldset`.
 *
 * 🔴 Клавиатура не пишется руками: у нативных радио одного имени стрелки,
 * перенос по кругу и одна остановка табуляции на всю группу работают сами.
 * Своя реализация на `div` потребовала бы `roving tabindex` — и сломалась бы
 * на первом же случае, о котором не подумали.
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
  disabled = false,
  required = false,
  orientation = 'vertical',
  id,
  className,
}: RadioGroupProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  return (
    <fieldset
      className={[styles.group, className].filter(Boolean).join(' ')}
      aria-describedby={describedBy}
      disabled={disabled}
    >
      <legend className={styles.legend}>
        {label}
        {required ? (
          <span className={fieldStyles.required} aria-hidden="true">
            {' *'}
          </span>
        ) : null}
      </legend>

      <div className={[styles.list, styles[orientation]].filter(Boolean).join(' ')}>
        {options.map((option) => {
          const optionId = `${fieldId}-${option.value}`;

          return (
            /* 🔴 Целиком строка — один `<label>`: попасть пальцем нужно в
               строку, а не в отметку 18×18. Псевдоэлементом тап-зону здесь не
               добрать — `::before` и `::after` на `input` не рисуются вовсе
               (замерено: зона выходила 0×0). */
            <label key={option.value} className={styles.item} htmlFor={optionId}>
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                className={[styles.control, styles.radio, invalid ? styles.controlInvalid : null]
                  .filter(Boolean)
                  .join(' ')}
                required={required}
                disabled={option.disabled}
                {...(value === undefined
                  ? { defaultChecked: defaultValue === option.value }
                  : { checked: value === option.value })}
                onChange={onChange === undefined ? undefined : () => onChange(option.value)}
              />
              <span className={styles.itemLabel}>
                <span className={styles.itemTitle}>{option.label}</span>
                {option.description === undefined ? null : (
                  <span className={styles.itemNote}>{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {hint === undefined ? null : (
        <p id={hintId} className={fieldStyles.hint}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className={fieldStyles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
