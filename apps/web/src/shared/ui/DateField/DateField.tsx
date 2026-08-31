'use client';

import type { KeyboardEvent } from 'react';
import { useRef } from 'react';

import { Field, type FieldVariant } from '../internal/Field';
import { controlClassName } from '../internal/controlClass';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './DateField.module.css';

/** Порядок сегментов — российский: день, месяц, год. */
const SEGMENTS = [
  { key: 'day', label: 'День', length: 2, min: 1, max: 31 },
  { key: 'month', label: 'Месяц', length: 2, min: 1, max: 12 },
  { key: 'year', label: 'Год', length: 4, min: 1900, max: 2100 },
] as const;

export type DateSegmentKey = (typeof SEGMENTS)[number]['key'];

/** Значение поля посегментно. Пустая строка — сегмент не заполнен. */
export type DateSegments = Readonly<Record<DateSegmentKey, string>>;

export const EMPTY_DATE: DateSegments = { day: '', month: '', year: '' };

export interface DateFieldProps {
  readonly label?: string | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly variant?: FieldVariant | undefined;
  readonly value: DateSegments;
  readonly onChange: (value: DateSegments) => void;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
}

function pad(value: string, length: number): string {
  return value.padStart(length, '0');
}

/**
 * Поле даты сегментами: дата выезда, период отчёта (issue #331).
 *
 * 🔴 Три поля вместо `input[type=date]`. Нативный редактор даты приносит
 * собственную высоту, собственный календарь и собственный порядок сегментов,
 * зависящий от локали системы: на машине с английской локалью владелец
 * получил бы месяц перед днём. Здесь порядок задан кодом — день, месяц, год.
 *
 * 🔴 Каждый сегмент — своё поле со своим именем для озвучки. Стрелки вверх и
 * вниз меняют значение, влево и вправо ходят между сегментами; заполненный
 * сегмент передаёт фокус следующему сам, а `Backspace` в пустом возвращает в
 * предыдущий. Это единственная часть, которую приходится писать руками, —
 * зато не приходится писать календарь.
 */
export function DateField({
  label,
  hint,
  error,
  variant,
  value,
  onChange,
  disabled,
  required,
  id,
  className,
}: DateFieldProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });
  const refs = useRef<Partial<Record<DateSegmentKey, HTMLInputElement | null>>>({});

  const focusSegment = (index: number) => {
    const segment = SEGMENTS[index];
    if (segment === undefined) return;

    refs.current[segment.key]?.focus();
    refs.current[segment.key]?.select();
  };

  const setSegment = (key: DateSegmentKey, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const handleInput = (index: number, key: DateSegmentKey, raw: string) => {
    const segment = SEGMENTS[index];
    if (segment === undefined) return;

    const digits = raw.replace(/\D/g, '').slice(0, segment.length);
    setSegment(key, digits);

    /* Переход к следующему сегменту, когда этот заполнен: набирая «01092026»
       подряд, человек не должен нажимать стрелку между числами. */
    if (digits.length === segment.length) focusSegment(index + 1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const segment = SEGMENTS[index];
    if (segment === undefined) return;

    const current = value[segment.key];

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const step = event.key === 'ArrowUp' ? 1 : -1;
      const base = current === '' ? segment.min - step : Number(current);
      const span = segment.max - segment.min + 1;
      const next = ((base - segment.min + step + span) % span) + segment.min;
      setSegment(segment.key, pad(String(next), segment.length));
      return;
    }

    if (event.key === 'ArrowLeft' && event.currentTarget.selectionStart === 0) {
      event.preventDefault();
      focusSegment(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && event.currentTarget.selectionEnd === current.length) {
      event.preventDefault();
      focusSegment(index + 1);
      return;
    }

    if (event.key === 'Backspace' && current === '') {
      event.preventDefault();
      focusSegment(index - 1);
    }
  };

  return (
    <Field
      fieldId={`${fieldId}-day`}
      label={label}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      required={required}
      labelInside
      variant={variant}
      className={className}
    >
      {/* Группа несёт имя всего поля: сегменты по отдельности озвучиваются
          «День», «Месяц», «Год», а вместе — «Дата выезда». */}
      <div
        className={controlClassName({
          variant,
          invalid,
          labelled: label !== undefined,
          own: [styles.shell],
        })}
        role="group"
        aria-label={label}
        aria-describedby={describedBy}
      >
        {SEGMENTS.map((segment, index) => (
          <span key={segment.key} className={styles.segmentBox}>
            {index === 0 ? null : (
              <span className={styles.separator} aria-hidden="true">
                .
              </span>
            )}
            <input
              ref={(node) => {
                refs.current[segment.key] = node;
              }}
              id={`${fieldId}-${segment.key}`}
              className={[styles.segment, styles[segment.key]].join(' ')}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={segment.label}
              /* 🔴 `aria-invalid` живёт на сегменте, а не на группе: роль
                 `group` этого атрибута не поддерживает вовсе, и озвучка его
                 там просто не читает. На поле ввода он работает. */
              aria-invalid={invalid || undefined}
              placeholder={'—'.repeat(segment.length)}
              value={value[segment.key]}
              disabled={disabled}
              required={required}
              onChange={(event) => handleInput(index, segment.key, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onFocus={(event) => event.currentTarget.select()}
            />
          </span>
        ))}
      </div>
    </Field>
  );
}
