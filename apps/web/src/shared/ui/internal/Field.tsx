import type { ReactNode } from 'react';
import styles from './Field.module.css';

/**
 * Четыре вида поля с эталона (ADR-170, `design/admin/_base.css`):
 *
 * - `flat` — заливка и обводка, умолчание: в панели серая, на витрине белая;
 * - `bordered` — только обводка, для таблиц-форм с полями вплотную;
 * - `faded` — серая заливка независимо от контура;
 * - `underlined` — одна линия снизу, для поля внутри строки таблицы.
 */
export type FieldVariant = 'flat' | 'bordered' | 'faded' | 'underlined';

export interface FieldProps {
  fieldId: string;
  label?: ReactNode | undefined;
  hint?: string | undefined;
  hintId?: string | undefined;
  error?: string | undefined;
  errorId?: string | undefined;
  required?: boolean | undefined;
  /**
   * Подпись ложится внутрь контрола — но только там, где контрол её вмещает:
   * у поля ввода, списка и многострочного. Галочка, ползунок и оценка зовут
   * ту же обвязку, и подпись у них остаётся снаружи.
   *
   * Проп решает, можно ли переносить; переносит — раскладка панели
   * (`Field.module.css`). На витрине подпись стоит над полем в обоих случаях.
   */
  labelInside?: boolean | undefined;
  /**
   * Вид поля — нужен только подписи внутри: у `underlined` боковых полей нет,
   * и подпись, отбитая на 15px, встала бы уступом над значением.
   */
  variant?: FieldVariant | undefined;
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
  labelInside = false,
  variant = 'flat',
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

  const labelClass = [
    styles.label,
    labelInside ? styles.labelInside : null,
    labelInside && variant === 'underlined' ? styles.labelFlush : null,
    error === undefined ? null : styles.labelInvalid,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label === undefined ? null : (
        <label htmlFor={fieldId} className={labelClass}>
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
