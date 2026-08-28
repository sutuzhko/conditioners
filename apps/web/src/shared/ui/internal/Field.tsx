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
}

/**
 * Внутренняя обвязка поля. Из UI Kit наружу не экспортируется: снаружи
 * используются готовые Input, Textarea, Select, FileInput, RangeSlider.
 *
 * 🔴 Подпись — всегда `<label>` (ADR-159). Раньше проп `labelAs` умел
 * отрисовать `<legend>`, но рисовал его внутри `<div>`: это невалидный HTML,
 * и группирующей семантики он не даёт — читалка такой «legend» не связывает
 * ни с чем. Проп при этом не звал никто: компонент, которому нужна группа,
 * обходится настоящим `<fieldset>`.
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
      {label === undefined ? null : (
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
