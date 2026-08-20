'use client';

import type { InputHTMLAttributes } from 'react';
import { Field } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import control from '../internal/control.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string | undefined;
  hint?: string | undefined;
  /** текст ошибки: и подсвечивает поле, и озвучивается скринридером */
  error?: string | undefined;
  /** класс на обёртку, а не на само поле — им управляет раскладка формы */
  wrapperClassName?: string | undefined;
}

export function Input({
  label,
  hint,
  error,
  id,
  required,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
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
      <input
        {...rest}
        id={fieldId}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={[control.control, invalid ? control.invalid : null, className]
          .filter(Boolean)
          .join(' ')}
      />
    </Field>
  );
}
