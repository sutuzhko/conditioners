import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'dark'
  /** для всегда-тёмных панелей: accent зависит от темы, а панель — нет */
  | 'onPanel'
  | 'sale'
  | 'success'
  | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** моноширинная техническая метка: «СХЕМА 1», «ШАГ 2» */
  mono?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  mono = false,
  className,
  ...rest
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    size === 'sm' ? styles.sm : null,
    mono ? styles.mono : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span {...rest} className={classes}>
      {children}
    </span>
  );
}
