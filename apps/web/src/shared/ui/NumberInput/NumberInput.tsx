'use client';

import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { Field, type FieldVariant } from '../internal/Field';
import { controlClassName } from '../internal/controlClass';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './NumberInput.module.css';

export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'value' | 'defaultValue' | 'onChange'
> {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  variant?: FieldVariant | undefined;
  /** Управляемое значение. `null` — поле пустое: ноль и «не введено» разное. */
  value?: number | null | undefined;
  defaultValue?: number | undefined;
  onValueChange?: ((value: number | null) => void) | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  /** Единица после числа: «м», «шт», «кг». Не влияет на значение. */
  unit?: string | undefined;
  decreaseLabel?: string | undefined;
  increaseLabel?: string | undefined;
  wrapperClassName?: string | undefined;
}

/** Приводит значение к шагу и границам: браузер этого сам не делает. */
function clamp(value: number, min: number | undefined, max: number | undefined): number {
  const low = min === undefined ? value : Math.max(value, min);
  return max === undefined ? low : Math.min(low, max);
}

/**
 * Числовое поле с шагом: количество материала в расходе (issue #331).
 *
 * 🔴 Кнопки шага — настоящие `<button>` со своими именами, а не стрелки
 * нативного `input[type=number]`. Нативные стрелки на телефоне не
 * показываются вовсе, мышью в них не попасть (они меньше 24×24), а озвучка их
 * не называет. Нативные стрелки при этом остаются доступны с клавиатуры —
 * тип поля не меняется.
 *
 * 🔴 Кнопки скрыты от озвучки (`aria-hidden` не ставится — у них есть имя),
 * но помечены `tabIndex={-1}`: с клавиатуры шаг делается стрелками на самом
 * поле, и две лишние остановки табуляции на каждое число в форме расхода —
 * это десятки лишних нажатий на пути к «Сохранить».
 */
export function NumberInput({
  label,
  hint,
  error,
  variant,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  unit,
  decreaseLabel = 'Уменьшить',
  increaseLabel = 'Увеличить',
  id,
  required,
  disabled,
  className,
  wrapperClassName,
  ...rest
}: NumberInputProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (onValueChange === undefined) return;

    const next = event.target.value;
    onValueChange(next === '' ? null : Number(next));
  };

  const nudge = (direction: 1 | -1) => {
    if (onValueChange === undefined) return;

    const base = value ?? defaultValue ?? min ?? 0;
    onValueChange(clamp(base + direction * step, min, max));
  };

  const atMin = min !== undefined && value !== null && value !== undefined && value <= min;
  const atMax = max !== undefined && value !== null && value !== undefined && value >= max;

  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      required={required}
      labelInside
      variant={variant}
      className={wrapperClassName}
    >
      <div className={styles.shell}>
        <input
          {...rest}
          type="number"
          inputMode="decimal"
          id={fieldId}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClassName({
            variant,
            invalid,
            labelled: label !== undefined,
            own: [styles.input, className],
          })}
          {...(value === undefined
            ? { defaultValue }
            : { value: value === null ? '' : String(value) })}
          onChange={handleChange}
        />

        {unit === undefined ? null : (
          <span className={styles.unit} aria-hidden="true">
            {unit}
          </span>
        )}

        <span className={styles.steps}>
          <button
            type="button"
            className={styles.step}
            aria-label={decreaseLabel}
            tabIndex={-1}
            disabled={disabled === true || atMin}
            onClick={() => nudge(-1)}
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            className={styles.step}
            aria-label={increaseLabel}
            tabIndex={-1}
            disabled={disabled === true || atMax}
            onClick={() => nudge(1)}
          >
            <span aria-hidden="true">+</span>
          </button>
        </span>
      </div>
    </Field>
  );
}
