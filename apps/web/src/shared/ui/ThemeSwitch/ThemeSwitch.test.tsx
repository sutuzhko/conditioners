import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeSwitch } from './ThemeSwitch';

/* Тема готовится до отрисовки и не убирается после: уборка снимала бы атрибут
   раньше, чем размонтируется наблюдатель внутри компонента, и его обновление
   приземлялось бы вне `act` (issue #237). */
beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.clear();
});

describe('ThemeSwitch', () => {
  it('это радиогруппа с двумя темами', () => {
    render(<ThemeSwitch />);

    expect(screen.getByRole('radiogroup', { name: 'Тема' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('имя группы задаёт вызывающий', () => {
    render(<ThemeSwitch label="Оформление" />);
    expect(screen.getByRole('radiogroup', { name: 'Оформление' })).toBeInTheDocument();
  });

  /* 🔴 Ради этого компонент и переведён на useSyncExternalStore: содержимое
     шторки монтируется уже после гидратации, и выбранный сегмент обязан быть
     виден в первой же отрисовке — иначе пилюля мигает при каждом открытии. */
  it('текущая тема отмечена сразу при монтировании, без второго кадра', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    render(<ThemeSwitch />);

    expect(screen.getByRole('radio', { name: 'Тёмная' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Светлая' })).not.toBeChecked();
  });

  it('выбор сегмента меняет тему на html и запоминает её', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);

    await user.click(screen.getByRole('radio', { name: 'Тёмная' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('tk-theme')).toBe('dark');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Тёмная' })).toBeChecked());
  });

  it('переключается стрелками с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Светлая' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Тёмная' })).toHaveFocus());
  });

  it('чужая смена темы отражается в выборе: переключателей на странице два', async () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole('radio', { name: 'Светлая' })).toBeChecked();

    // так выглядит нажатие кнопки в шапке или смена темы извне
    document.documentElement.setAttribute('data-theme', 'dark');

    await waitFor(() => expect(screen.getByRole('radio', { name: 'Тёмная' })).toBeChecked());
  });

  it('недоступное хранилище не ломает переключение', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    render(<ThemeSwitch />);

    await user.click(screen.getByRole('radio', { name: 'Тёмная' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    vi.restoreAllMocks();
  });
});
