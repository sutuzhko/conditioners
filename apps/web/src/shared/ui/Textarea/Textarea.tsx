'use client';

import type { TextareaHTMLAttributes } from 'react';
import { Field, type FieldVariant } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import { controlClassName } from '../internal/controlClass';
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  variant?: FieldVariant | undefined;
  wrapperClassName?: string | undefined;
}

export function Textarea({
  label,
  hint,
  error,
  variant,
  id,
  required,
  rows = 4,
  className,
  wrapperClassName,
  ...rest
}: TextareaProps) {
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
      labelInside
      variant={variant}
      className={wrapperClassName}
    >
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={controlClassName({
          variant,
          invalid,
          labelled: label !== undefined,
          own: [styles.textarea, className],
        })}
      />
    </Field>
  );
}
