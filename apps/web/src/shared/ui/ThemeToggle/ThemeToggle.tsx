'use client';

import { useEffect, useState } from 'react';

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
  /**
   * Состояние сообщается через aria-pressed («нажата» = тёмная тема), а не
   * сменой подписи «включить тёмную/светлую»: имя кнопки обязано быть
   * стабильным — переименование сфокусированного элемента читалки объявляют
   * ненадёжно, тогда как смену pressed проговаривают всегда. К тому же
   * подпись задаётся пропсом снаружи и про тему ничего не знает.
   */
  const [pressed, setPressed] = useState<boolean | undefined>(undefined);

  // Тему выставляет инлайн-скрипт в <head>, поэтому серверный HTML её не
  // знает: до маунта атрибута aria-pressed честно нет. Читаем состояние из
  // DOM и следим за ним наблюдателем, а не пишем в toggle: кнопок на
  // странице две (шапка и выдвижное меню), и обе должны говорить правду.
  useEffect(() => {
    const root = document.documentElement;
    const read = (): void => {
      setPressed(root.dataset.theme === 'dark');
    };

    read();
    const watcher = new MutationObserver(read);
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watcher.disconnect();
  }, []);

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
      aria-pressed={pressed}
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
