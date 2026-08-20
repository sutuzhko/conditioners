'use client';

import type { ChangeEvent } from 'react';
import { Field } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './RangeSlider.module.css';

export interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number | undefined;
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  /** как показать число: «25 м²», «6,5 ₽/кВт·ч». Тексты единиц приходят снаружи */
  formatValue?: ((value: number) => string) | undefined;
  /** подписи краёв шкалы; по умолчанию берутся из formatValue */
  showScale?: boolean | undefined;
  className?: string | undefined;
}

export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  hint,
  error,
  id,
  name,
  disabled,
  formatValue,
  showScale = true,
  className,
}: RangeSliderProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });
  const format = formatValue ?? ((next: number) => String(next));

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <Field
      fieldId={fieldId}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      className={className}
    >
      {label === undefined ? null : (
        <span className={styles.head}>
          <label htmlFor={fieldId}>{label}</label>
          <output htmlFor={fieldId} className={styles.value}>
            {format(value)}
          </output>
        </span>
      )}
      <input
        type="range"
        id={fieldId}
        name={name}
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-valuetext={format(value)}
      />
      {showScale ? (
        <span className={styles.scale} aria-hidden="true">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </span>
      ) : null}
    </Field>
  );
}
