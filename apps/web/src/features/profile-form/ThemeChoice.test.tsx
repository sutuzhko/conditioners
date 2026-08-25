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
});
