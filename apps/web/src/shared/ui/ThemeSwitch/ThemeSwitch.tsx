'use client';

import { useId } from 'react';
import { useTheme } from '../lib/useTheme';
import type { Theme } from '../lib/useTheme';
import styles from './ThemeSwitch.module.css';

/**
 * Подписи сегментов называют сами темы, а не место, где стоит переключатель, —
 * поэтому живут здесь, а не приходят пропсом от виджета.
 */
const OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export interface ThemeSwitchProps {
  /** имя группы для читалки: «Тема», «Оформление» — задаёт вызывающий */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * Сегментированный переключатель темы: «Светлая / Тёмная» одной пилюлей.
 *
 * Отдельный компонент, а не флаг у `ThemeToggle`: в шапке места хватает только
 * на значок, а в подвале выдвижного меню наоборот — значок без подписи там
 * читается как загадка, и обе темы должны быть видны сразу (issue #248).
 *
 * 🔴 Радиогруппа на нативных `input[type=radio]`, а не две кнопки: стрелки
 * ходят по вариантам, Tab входит в группу один раз и встаёт на выбранный —
 * это поведение браузера, и повторять его руками значит повторять с ошибками.
 */
export function ThemeSwitch({ label = 'Тема', className }: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();
  const group = useId();

  return (
    <div
      className={[styles.switch, className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
    >
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.segment}>
          <input
            className={`srOnly ${styles.input}`}
            type="radio"
            name={group}
            value={option.value}
            /* до маунта тема неизвестна — тогда не выбран ни один сегмент,
               и это честнее, чем показать «Светлая» тому, у кого тёмная */
            checked={theme === option.value}
            onChange={() => {
              setTheme(option.value);
            }}
          />
          <span className={styles.text}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
