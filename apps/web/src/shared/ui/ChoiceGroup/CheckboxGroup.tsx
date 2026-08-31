'use client';

import fieldStyles from '../internal/Field.module.css';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './ChoiceGroup.module.css';
import type { ChoiceOption, ChoiceOrientation } from './RadioGroup';

export interface CheckboxGroupProps {
  /** Подпись группы. Становится `<legend>` — у группы имя одно на всех. */
  readonly label: string;
  readonly name: string;
  readonly options: readonly ChoiceOption[];
  /** Выбранные значения. Управляемая группа — когда список чем-то фильтруют. */
  readonly value?: readonly string[] | undefined;
  readonly defaultValue?: readonly string[] | undefined;
  readonly onChange?: ((value: readonly string[]) => void) | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly orientation?: ChoiceOrientation | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Группа галочек: фильтры списков, чеклист выезда (issue #331).
 *
 * 🔴 Как и у радио — `<fieldset>` с `<legend>`: без группы озвучка читает
 * каждую галочку отдельно и не говорит, к какому вопросу это ответ.
 *
 * 🔴 Стрелки внутри группы галочек не работают — и не должны. У галочек нет
 * общего значения: каждая независима, каждая своя остановка табуляции, каждая
 * переключается пробелом. Стрелки, приделанные сюда «для симметрии» с радио,
 * ломали бы прокрутку страницы, стоя на галочке.
 */
export function CheckboxGroup({
  label,
  name,
  options,
  value,
  defaultValue = [],
  onChange,
  hint,
  error,
  disabled = false,
  orientation = 'vertical',
  id,
  className,
}: CheckboxGroupProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  const toggle = (option: string, checked: boolean) => {
    if (onChange === undefined || value === undefined) return;

    onChange(checked ? [...value, option] : value.filter((item) => item !== option));
  };

  return (
    <fieldset
      className={[styles.group, className].filter(Boolean).join(' ')}
      aria-describedby={describedBy}
      disabled={disabled}
    >
      <legend className={styles.legend}>{label}</legend>

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
                type="checkbox"
                id={optionId}
                name={name}
                value={option.value}
                className={[styles.control, styles.checkbox, invalid ? styles.controlInvalid : null]
                  .filter(Boolean)
                  .join(' ')}
                disabled={option.disabled}
                {...(value === undefined
                  ? { defaultChecked: defaultValue.includes(option.value) }
                  : { checked: value.includes(option.value) })}
                onChange={(event) => toggle(option.value, event.target.checked)}
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
