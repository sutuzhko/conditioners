'use client';

import type { InputHTMLAttributes, Ref } from 'react';
import { Field, type FieldVariant } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import { controlClassName } from '../internal/controlClass';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string | undefined;
  hint?: string | undefined;
  /** текст ошибки: и подсвечивает поле, и озвучивается скринридером */
  error?: string | undefined;
  /** вид поля; умолчание — `flat`: заливка и обводка */
  variant?: FieldVariant | undefined;
  /** класс на обёртку, а не на само поле — им управляет раскладка формы */
  wrapperClassName?: string | undefined;
  /** Ссылка на само поле: нужна маске телефона, чтобы вернуть курсор на место. */
  ref?: Ref<HTMLInputElement> | undefined;
}

export function Input({
  label,
  hint,
  error,
  variant,
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
      labelInside
      variant={variant}
      className={wrapperClassName}
    >
      <input
        {...rest}
        id={fieldId}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={controlClassName({
          variant,
          invalid,
          labelled: label !== undefined,
          own: [className],
        })}
      />
    </Field>
  );
}
