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
  /**
   * Разрешить перенос строки.
   *
   * 🔴 По умолчанию плашка не переносится: она пилюля, и «Класс 09» или
   * «−15%», сломанные пополам, читаются как ошибка вёрстки. Но там, где текст
   * приходит из настроек, длину задаёт владелец — и плашка, которая ломается
   * от шестого слова, не решение (ADR-126). Такие места включают перенос
   * явно, чтобы выбор был виден в месте вызова, а не спрятан в ките.
   */
  wrap?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  mono = false,
  wrap = false,
  className,
  ...rest
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    size === 'sm' ? styles.sm : null,
    mono ? styles.mono : null,
    wrap ? styles.wrap : null,
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
