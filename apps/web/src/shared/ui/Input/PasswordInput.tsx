'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react';

import { Icon } from '../Icon';
import { Field, type FieldVariant } from '../internal/Field';
import { controlClassName } from '../internal/controlClass';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './PasswordInput.module.css';

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  label?: string | undefined;
  hint?: string | undefined;
  /** текст ошибки: и подсвечивает поле, и озвучивается скринридером */
  error?: string | undefined;
  variant?: FieldVariant | undefined;
  /** класс на обёртку, а не на само поле — им управляет раскладка формы */
  wrapperClassName?: string | undefined;
  /** имя кнопки, пока пароль скрыт */
  showLabel?: string | undefined;
  /** имя кнопки, пока пароль показан */
  hideLabel?: string | undefined;
}

/**
 * Поле пароля с показом введённого (issue #754).
 *
 * 🔴 Живёт в ките, а не в форме входа. Одно и то же поле стоит в четырёх
 * местах панели — вход, смена пароля в профиле, создание и правка аккаунта
 * монтажника, — и владелец диктует пароль монтажнику по телефону, глядя на
 * экран. Три реализации показа разошлись бы на первой же правке.
 *
 * 🔴 Показ переключает тип поля, и больше ничего. Значение не уезжает ни во
 * второй узел, ни в атрибут: открытый пароль живёт ровно там же, где скрытый,
 * — в свойстве `value` самого поля.
 *
 * 🔴 Пароль скрывается обратно сам — при отправке формы, при уходе фокуса со
 * всей группы и по Escape. Открытый пароль, забытый на экране в чужой
 * квартире, — ровно тот случай, ради которого он и скрыт. Escape при этом не
 * гасится: если поле однажды окажется внутри окна, окну достанется тот же
 * Escape и оно закроется, как закрывалось.
 *
 * 🔴 Кнопка не забирает фокус мышью (`preventDefault` на `mousedown`).
 * Во-первых, каретка остаётся в поле — показ читают, чтобы дописать пароль, а
 * не чтобы уйти из него. Во-вторых, Safari на macOS кнопкам фокус по нажатию
 * не даёт вовсе: поле теряло бы фокус «в никуда», группа считала бы это
 * уходом и гасила показ ровно в тот момент, когда его включают.
 */
export function PasswordInput({
  label,
  hint,
  error,
  variant,
  id,
  required,
  disabled,
  className,
  wrapperClassName,
  showLabel = 'Показать пароль',
  hideLabel = 'Скрыть пароль',
  ...rest
}: PasswordInputProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Отправка гасит показ на самой форме, а не на кнопке «Войти»: форму
     отправляют и с клавиатуры, и вовсе не той кнопкой, которую видно. */
  useEffect(() => {
    if (!shown) return undefined;

    const form = inputRef.current?.form ?? null;
    if (form === null) return undefined;

    const hide = (): void => setShown(false);
    form.addEventListener('submit', hide);
    form.addEventListener('reset', hide);

    return () => {
      form.removeEventListener('submit', hide);
      form.removeEventListener('reset', hide);
    };
  }, [shown]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    /* Переход между полем и кнопкой показа — не уход: группа считается
       покинутой, только когда фокус ушёл за её пределы. */
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setShown(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') setShown(false);
  };

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
      <div className={styles.shell} onBlur={handleBlur} onKeyDown={handleKeyDown}>
        <input
          {...rest}
          ref={inputRef}
          type={shown ? 'text' : 'password'}
          id={fieldId}
          required={required}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClassName({
            variant,
            invalid,
            labelled: label !== undefined,
            own: [styles.input, className],
          })}
        />

        <button
          type="button"
          className={styles.toggle}
          aria-label={shown ? hideLabel : showLabel}
          aria-pressed={shown}
          aria-controls={fieldId}
          disabled={disabled}
          onMouseDown={(event) => {
            /* Фокус кнопке не отдаём, но и в никуда не отпускаем: он уходит в
               само поле. Иначе группа осталась бы без фокуса вовсе — пароль,
               подставленный менеджером и показанный мышью, не гас бы при уходе
               с формы, потому что уходить было бы нечему. */
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onClick={() => setShown((current) => !current)}
        >
          <span aria-hidden="true">
            <Icon name={shown ? 'eye-closed' : 'eye'} size={16} />
          </span>
        </button>
      </div>
    </Field>
  );
}
