import type { ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldProps {
  fieldId: string;
  label?: ReactNode | undefined;
  hint?: string | undefined;
  hintId?: string | undefined;
  error?: string | undefined;
  errorId?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
  /** подпись ведёт не к одному контролу, а к группе — тогда она legend */
  labelAs?: 'label' | 'legend' | undefined;
}

/**
 * Внутренняя обвязка поля. Из UI Kit наружу не экспортируется: снаружи
 * используются готовые Input, Textarea, Select, FileInput, RangeSlider.
 */
export function Field({
  fieldId,
  label,
  hint,
  hintId,
  error,
  errorId,
  required = false,
  className,
  children,
  labelAs = 'label',
}: FieldProps) {
  const labelContent = (
    <>
      {label}
      {required ? (
        <span className={styles.required} aria-hidden="true">
          {' *'}
        </span>
      ) : null}
    </>
  );

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label === undefined ? null : labelAs === 'legend' ? (
        <legend className={styles.label}>{labelContent}</legend>
      ) : (
        <label htmlFor={fieldId} className={styles.label}>
          {labelContent}
        </label>
      )}
      {children}
      {hint === undefined ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
