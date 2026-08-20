'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useFieldIds } from '../internal/useFieldIds';
import fieldStyles from '../internal/Field.module.css';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** ReactNode, а не строка: внутрь согласия нужна ссылка на политику */
  label: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  wrapperClassName?: string | undefined;
}

export function Checkbox({
  label,
  hint,
  error,
  id,
  required,
  className,
  wrapperClassName,
  ...rest
}: CheckboxProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  return (
    <div className={[styles.root, wrapperClassName].filter(Boolean).join(' ')}>
      <div className={styles.row}>
        <input
          {...rest}
          type="checkbox"
          id={fieldId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={[styles.input, invalid ? styles.invalid : null, className]
            .filter(Boolean)
            .join(' ')}
        />
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          ) : null}
        </label>
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
    </div>
  );
}
