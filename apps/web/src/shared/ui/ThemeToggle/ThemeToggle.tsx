'use client';

import { IconButton } from '../IconButton/IconButton';
import type { IconButtonSize, IconButtonVariant } from '../IconButton/IconButton';
import styles from './ThemeToggle.module.css';

/** Ключ тот же, что читает инлайн-скрипт в <head> — иначе тема разъедется. */
const STORAGE_KEY = 'tk-theme';

export interface ThemeToggleProps {
  label?: string | undefined;
  size?: IconButtonSize | undefined;
  variant?: IconButtonVariant | undefined;
  className?: string | undefined;
  /** вызывается после смены — например, чтобы перерисовать зависящий от темы холст */
  onToggle?: ((theme: 'light' | 'dark') => void) | undefined;
}

export function ThemeToggle({
  label = 'Переключить тему',
  size = 'sm',
  variant = 'ghost',
  className,
  onToggle,
}: ThemeToggleProps) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // приватный режим запрещает запись — тема просто не переживёт перезагрузку
    }
    onToggle?.(next);
  };

  return (
    <IconButton
      label={label}
      variant={variant}
      size={size}
      className={className}
      onClick={toggle}
      icon={
        <>
          <svg
            className={styles.toDark}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            className={styles.toLight}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </>
      }
    />
  );
}
