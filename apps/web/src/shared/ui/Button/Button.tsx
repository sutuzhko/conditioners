import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonAppearance {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** растянуть на всю ширину контейнера — форма на мобильном */
  fullWidth?: boolean | undefined;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonAppearance {
  /** состояние отправки: кнопка блокируется, подпись подменяется индикатором */
  loading?: boolean | undefined;
  iconStart?: ReactNode | undefined;
  iconEnd?: ReactNode | undefined;
}

/** Собирает набор классов, общий для кнопки и ссылки-кнопки. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonAppearance): string {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : null]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  iconStart,
  iconEnd,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    buttonClassName({ variant, size, fullWidth }),
    loading ? styles.loading : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      <span className={styles.content}>
        {iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
}
