import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeChoice } from './ThemeChoice';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

describe('Выбор темы в профиле', () => {
  it('без записи в хранилище выбрана системная', async () => {
    render(<ThemeChoice />);

    expect(
      await screen.findByRole('button', { name: 'Системная', pressed: true }),
    ).toBeInTheDocument();
  });

  it('сохранённая тема подсвечена', async () => {
    localStorage.setItem('tk-theme', 'dark');
    render(<ThemeChoice />);

    expect(
      await screen.findByRole('button', { name: 'Тёмная', pressed: true }),
    ).toBeInTheDocument();
  });

  it('выбор темы записывается и применяется сразу', async () => {
    const user = userEvent.setup();
    render(<ThemeChoice />);

    await user.click(screen.getByRole('button', { name: 'Тёмная' }));

    expect(localStorage.getItem('tk-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('🔴 системная стирает запись, а не пишет третье значение: её так читает скрипт в <head>', async () => {
    const user = userEvent.setup();
    localStorage.setItem('tk-theme', 'dark');
    render(<ThemeChoice />);

    await user.click(screen.getByRole('button', { name: 'Системная' }));

    expect(localStorage.getItem('tk-theme')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  /* 🔴 Граница контрола обязана держать 3:1 (WCAG 1.4.11, ADR-181): без неё
     невыбранный вариант темы не виден: заливки у него нет. `--line-strong` даёт 1,48:1 — вдвое ниже нормы. */
  it('🔴 граница не возвращается на --line-strong', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'ThemeChoice.module.css'),
      'utf8',
    );

    expect(css).not.toContain('var(--line-strong)');
  });
});
