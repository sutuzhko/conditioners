'use client';

import { useFieldIds } from '../internal/useFieldIds';
import fieldStyles from '../internal/Field.module.css';
import styles from './Rating.module.css';

export type RatingSize = 'sm' | 'md' | 'lg';

interface RatingCommon {
  /** сколько звёзд в шкале; по умолчанию пять */
  max?: number | undefined;
  size?: RatingSize | undefined;
  className?: string | undefined;
}

export interface RatingDisplayProps extends RatingCommon {
  mode?: 'display' | undefined;
  value: number;
  /** подпись рядом со звёздами: «4,8 · 37 отзывов» */
  caption?: string | undefined;
}

export interface RatingInputProps extends RatingCommon {
  mode: 'input';
  value: number;
  onChange: (value: number) => void;
  /** имя группы радиокнопок — форма отправляет именно его */
  name: string;
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
}

export type RatingProps = RatingDisplayProps | RatingInputProps;

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={[styles.star, filled ? styles.filled : null].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
    </svg>
  );
}

/** «Оценка 4 из 5» — то, что услышит скринридер вместо пяти одинаковых значков. */
function ratingLabel(value: number, max: number): string {
  return `Оценка ${value} из ${max}`;
}

function positionsOf(max: number): number[] {
  return Array.from({ length: max }, (_, index) => index + 1);
}

function RatingDisplay({ value, caption, max = 5, size = 'md', className }: RatingDisplayProps) {
  return (
    <span
      className={[styles.stars, styles[size], className].filter(Boolean).join(' ')}
      role="img"
      aria-label={ratingLabel(value, max)}
    >
      {positionsOf(max).map((position) => (
        <Star key={position} filled={position <= value} />
      ))}
      {caption === undefined ? null : (
        <span className={styles.caption} aria-hidden="true">
          {caption}
        </span>
      )}
    </span>
  );
}

function RatingInput({
  value,
  onChange,
  name,
  label,
  hint,
  error,
  id,
  disabled,
  required,
  max = 5,
  size = 'md',
  className,
}: RatingInputProps) {
  // aria-invalid у роли radio не поддерживается: о проблеме сообщает
  // сообщение с role="alert", связанное через aria-describedby
  const { fieldId, hintId, errorId, describedBy } = useFieldIds({ id, hint, error });

  return (
    <fieldset className={[styles.fieldset, className].filter(Boolean).join(' ')}>
      {label === undefined ? null : (
        <legend className={fieldStyles.label}>
          {label}
          {required === true ? (
            <span className={fieldStyles.required} aria-hidden="true">
              {' *'}
            </span>
          ) : null}
        </legend>
      )}
      <span className={[styles.stars, styles[size]].filter(Boolean).join(' ')}>
        {positionsOf(max).map((position) => (
          <span key={position} className={styles.cell}>
            <input
              type="radio"
              className={`srOnly ${styles.radio}`}
              id={`${fieldId}-${position}`}
              name={name}
              value={position}
              checked={position === value}
              disabled={disabled}
              required={required}
              aria-describedby={describedBy}
              onChange={() => onChange(position)}
            />
            <label
              htmlFor={`${fieldId}-${position}`}
              className={[styles.option, position <= value ? styles.optionFilled : null]
                .filter(Boolean)
                .join(' ')}
            >
              <Star filled={position <= value} />
              <span className="srOnly">{ratingLabel(position, max)}</span>
            </label>
          </span>
        ))}
      </span>
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
    </fieldset>
  );
}

/**
 * Звёзды. Один компонент на два сценария: вывод оценки в карточке отзыва
 * и ввод в форме. Режимы различаются дискриминантом mode, а не набором
 * необязательных пропсов, — иначе «ввод без onChange» стал бы возможен.
 */
export function Rating(props: RatingProps) {
  return props.mode === 'input' ? <RatingInput {...props} /> : <RatingDisplay {...props} />;
}
