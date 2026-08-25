'use client';

import { useEffect, useState } from 'react';

import { profileFormContent as texts } from './content';
import styles from './ThemeChoice.module.css';

/** Ключ тот же, что читает инлайн-скрипт в <head> — иначе тема разъедется. */
const STORAGE_KEY = 'tk-theme';

type ThemeChoiceValue = 'light' | 'dark' | 'auto';

const OPTIONS: readonly { value: ThemeChoiceValue; title: string }[] = [
  { value: 'light', title: 'Светлая' },
  { value: 'dark', title: 'Тёмная' },
  { value: 'auto', title: 'Системная' },
];

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Выбор темы из трёх состояний.
 *
 * Переключатель в шапке умеет только «светлая ↔ тёмная»: он рядом с работой,
 * и третий шаг там мешал бы. «Системная» — это отсутствие записи в
 * `localStorage`: ровно так её понимает инлайн-скрипт в `<head>`, и хранить
 * рядом второй признак значило бы дать им шанс разойтись.
 */
export function ThemeChoice() {
  /* Начальное значение читается после гидратации: на сервере localStorage
     нет, а угаданное «светлая» мигнуло бы выделением не той кнопки. */
  const [choice, setChoice] = useState<ThemeChoiceValue | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setChoice(stored === 'light' || stored === 'dark' ? stored : 'auto');
    } catch {
      setChoice('auto');
    }
  }, []);

  const apply = (value: ThemeChoiceValue): void => {
    setChoice(value);

    try {
      if (value === 'auto') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // приватный режим запрещает запись — выбор просто не переживёт перезагрузку
    }

    document.documentElement.setAttribute('data-theme', value === 'auto' ? systemTheme() : value);
  };

  return (
    <div className={styles.row} role="group" aria-label={texts.themeTitle}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[styles.option, choice === option.value ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={choice === option.value}
          onClick={() => apply(option.value)}
        >
          {option.title}
        </button>
      ))}
    </div>
  );
}
