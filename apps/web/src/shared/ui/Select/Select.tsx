'use client';

import type { SelectHTMLAttributes } from 'react';
import { Field } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import control from '../internal/control.module.css';
import styles from './Select.module.css';
import { Icon } from '../Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[];
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  /** первый неактивный пункт: «Выберите вариант» */
  placeholder?: string | undefined;
  wrapperClassName?: string | undefined;
}

export function Select({
  options,
  label,
  hint,
  error,
  placeholder,
  id,
  required,
  className,
  wrapperClassName,
  ...rest
}: SelectProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      required={required}
      className={wrapperClassName}
    >
      <span className={styles.wrapper}>
        <select
          {...rest}
          id={fieldId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={[control.control, styles.select, invalid ? control.invalid : null, className]
            .filter(Boolean)
            .join(' ')}
        >
          {placeholder === undefined ? null : (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={14} className={styles.chevron} />
      </span>
    </Field>
  );
}
