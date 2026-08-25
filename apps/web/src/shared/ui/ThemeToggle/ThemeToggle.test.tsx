import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.clear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('имеет понятное имя для скринридера', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Переключить тему' })).toBeInTheDocument();
  });

  it('меняет тему на html и запоминает выбор', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('tk-theme')).toBe('dark');
  });

  it('переключается туда и обратно', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('работает с клавиатуры и сообщает выбранную тему наружу', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ThemeToggle onToggle={onToggle} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledWith('dark');
  });

  it('сообщает состояние через aria-pressed: нажата — значит тёмная тема', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // состояние читается из DOM после маунта — серверный HTML темы не знает
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
  });

  it('чужая смена темы отражается в состоянии: кнопок на странице две', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));

    // так выглядит нажатие второй кнопки (в выдвижном меню) или смена извне
    document.documentElement.setAttribute('data-theme', 'dark');

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  });

  it('недоступное хранилище не ломает переключение', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    vi.restoreAllMocks();
  });
});
