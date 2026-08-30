'use client';

import { IconButton } from '../IconButton/IconButton';
import type { IconButtonSize, IconButtonVariant } from '../IconButton/IconButton';
import { useTheme } from '../lib/useTheme';
import styles from './ThemeToggle.module.css';
import { Icon } from '../Icon';

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
  /**
   * Состояние сообщается через aria-pressed («нажата» = тёмная тема), а не
   * сменой подписи «включить тёмную/светлую»: имя кнопки обязано быть
   * стабильным — переименование сфокусированного элемента читалки объявляют
   * ненадёжно, тогда как смену pressed проговаривают всегда. К тому же
   * подпись задаётся пропсом снаружи и про тему ничего не знает.
   *
   * До маунта темы нет (её ставит инлайн-скрипт в <head>), и тогда атрибута
   * честно нет тоже: `useTheme` отдаёт `undefined`.
   */
  const { theme, toggle } = useTheme();

  return (
    <IconButton
      label={label}
      variant={variant}
      size={size}
      className={className}
      /* 🔴 Смена темы вызывается отдельной строкой, а не аргументом
         `onToggle?.(toggle())`: у необязательного вызова короткое замыкание
         пропускает и вычисление аргументов — без обработчика снаружи тема
         вообще перестала бы переключаться. */
      onClick={() => {
        const next = toggle();
        onToggle?.(next);
      }}
      aria-pressed={theme === undefined ? undefined : theme === 'dark'}
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
