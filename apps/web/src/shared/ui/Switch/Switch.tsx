'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

import fieldStyles from '../internal/Field.module.css';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './Switch.module.css';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children'
> {
  /** Подпись рядом с переключателем. ReactNode — внутрь бывает нужна ссылка. */
  label: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  size?: SwitchSize | undefined;
  /** Подпись слева от дорожки: так стоят флаги настроек в эталоне. */
  labelFirst?: boolean | undefined;
  wrapperClassName?: string | undefined;
}

/**
 * Переключатель: «Активен / Не работает», флаги настроек (issue #331).
 *
 * 🔴 Это `input[type=checkbox]`, а не `div` с `role="switch"`. Нативная
 * галочка приносит бесплатно всё, что иначе пришлось бы писать руками и
 * однажды забыть: фокус, пробел, участие в форме, состояние `:disabled`,
 * связь с подписью через `htmlFor`. Роль `switch` ставится атрибутом —
 * озвучка тогда говорит «включено», а не «отмечено».
 *
 * 🔴 Разница с галочкой не в оформлении. Галочка — это «я согласен», её
 * значение уезжает с отправкой формы. Переключатель — это состояние, которое
 * действует немедленно. Поэтому один компонент на оба случая не годится, хотя
 * элемент под ними один.
 */
export function Switch({
  label,
  hint,
  error,
  size = 'md',
  labelFirst = false,
  id,
  className,
  wrapperClassName,
  ...rest
}: SwitchProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });

  return (
    <div className={[styles.root, wrapperClassName].filter(Boolean).join(' ')}>
      <div
        className={[styles.row, labelFirst ? styles.rowReversed : null].filter(Boolean).join(' ')}
      >
        {/* Дорожка и бегунок рисуются на `<label>`, а сам ввод спрятан
            утилитой `.srOnly` и остаётся в потоке: так фокус приходит на
            настоящий элемент, а не на его картинку. */}
        <label
          htmlFor={fieldId}
          className={[styles.track, styles[size], invalid ? styles.invalid : null]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.thumb} aria-hidden="true" />
        </label>
        <input
          {...rest}
          type="checkbox"
          role="switch"
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={['srOnly', styles.input, className].filter(Boolean).join(' ')}
        />
        <label htmlFor={fieldId} className={styles.label}>
          {label}
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
