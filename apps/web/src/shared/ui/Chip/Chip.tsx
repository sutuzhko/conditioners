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
}

export function Chip({
  children,
  selected = false,
  size = 'md',
  count,
  className,
  type = 'button',
  ...rest
}: ChipProps) {
  const classes = [
    styles.chip,
    size === 'sm' ? styles.sm : null,
    selected ? styles.selected : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...rest} type={type} className={classes} aria-pressed={selected}>
      {children}
      {count === undefined ? null : <span className={styles.count}>{count}</span>}
    </button>
  );
}
