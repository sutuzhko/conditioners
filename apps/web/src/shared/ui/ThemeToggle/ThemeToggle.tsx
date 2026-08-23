'use client';

import { IconButton } from '../IconButton/IconButton';
import type { IconButtonSize, IconButtonVariant } from '../IconButton/IconButton';
import styles from './ThemeToggle.module.css';
import { Icon } from '../Icon';

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
          {/* обе иконки в разметке всегда: тема переключается CSS-классами,
              и подмена узла давала бы прыжок при первой отрисовке */}
          <Icon name="moon" size={18} className={styles.toDark} />
          <Icon name="sun" size={18} className={styles.toLight} />
        </>
      }
    />
  );
}
