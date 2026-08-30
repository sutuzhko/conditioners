'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Chip.module.css';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** выбран ли чип; управляется снаружи — состояние выбора живёт в фильтре */
  selected?: boolean;
  size?: 'sm' | 'md';
  /** счётчик справа: «Инверторные 12» */
  count?: number;
  /**
   * Сбросить выбор — крестик справа.
   *
   * 🔴 Крестик рисуется отдельной кнопкой внутри чипа, а не вторым смыслом
   * того же нажатия: «выбрать» и «сбросить» — разные действия, и человек,
   * который целится в крестик и промахивается, не должен снимать фильтр
   * целиком. Кнопка в кнопке невалидна, поэтому сам чип в этом случае
   * остаётся кнопкой, а крестик выносится соседним элементом ряда.
   */
  onRemove?: (() => void) | undefined;
  /** имя кнопки сброса; по умолчанию — «Сбросить» */
  removeLabel?: string | undefined;
}

/**
 * Интерактивный фильтр: по нему нажимают, и он помнит выбор. Плашка, которую
 * только показывают, — это `Badge` (issue #326): у них разная геометрия,
 * разные состояния и разная семантика в разметке.
 */
export function Chip({
  children,
  selected = false,
  size = 'md',
  count,
  onRemove,
  removeLabel = 'Сбросить',
  className,
  type = 'button',
  ...rest
}: ChipProps) {
  const classes = [
    styles.chip,
    size === 'sm' ? styles.sm : null,
    selected ? styles.selected : null,
    onRemove === undefined ? null : styles.removable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const chip = (
    <button {...rest} type={type} className={classes} aria-pressed={selected}>
      {children}
      {count === undefined ? null : <span className={styles.count}>{count}</span>}
    </button>
  );

  if (onRemove === undefined) return chip;

  return (
    <span className={styles.group}>
      {chip}
      <button
        type="button"
        className={[
          styles.remove,
          size === 'sm' ? styles.sm : null,
          selected ? styles.removeSelected : null,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m6 6 12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}
