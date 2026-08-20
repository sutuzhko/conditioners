'use client';

import type { TextareaHTMLAttributes } from 'react';
import { Field } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import control from '../internal/control.module.css';
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  wrapperClassName?: string | undefined;
}

export function Textarea({
  label,
  hint,
  error,
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
      className={wrapperClassName}
    >
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={[control.control, styles.textarea, invalid ? control.invalid : null, className]
          .filter(Boolean)
          .join(' ')}
      />
    </Field>
  );
}
