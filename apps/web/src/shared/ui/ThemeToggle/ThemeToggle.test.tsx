import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

/* 🔴 Тема готовится до отрисовки и не убирается после.
   Уборка после теста снимала атрибут раньше, чем Testing Library успевала
   размонтировать дерево: наблюдатель внутри ещё живой кнопки видел смену и
   ставил состояние вне `act` — по предупреждению на каждый тест файла
   (issue #237). Убирать нечего: следующий тест задаёт тему сам, а документ
   у каждого файла свой. */
beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.clear();
});

/**
 * 🔴 Клик по кнопке — только половина работы. Тему компонент читает из DOM
 * наблюдателем, и `setPressed` приходит следующим тактом, уже за пределами
 * `act` того клика. Тест, который на этом заканчивается, оставляет обновление
 * висеть: React печатает «update was not wrapped in act», а под нагрузкой оно
 * приземляется посреди следующей проверки (issue #237).
 *
 * Ждём не «немного», а именно того, ради чего наблюдатель и заведён: кнопка
 * сообщила новое состояние.
 */
async function toggleAndSettle(
  user: ReturnType<typeof userEvent.setup>,
  pressed: 'true' | 'false',
): Promise<void> {
  const button = screen.getByRole('button');

  await user.click(button);
  await waitFor(() => expect(button).toHaveAttribute('aria-pressed', pressed));
}

describe('ThemeToggle', () => {
  it('имеет понятное имя для скринридера', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Переключить тему' })).toBeInTheDocument();
  });

  it('меняет тему на html и запоминает выбор', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await toggleAndSettle(user, 'true');

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('tk-theme')).toBe('dark');
  });

  it('переключается туда и обратно', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await toggleAndSettle(user, 'true');
    await toggleAndSettle(user, 'false');

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('работает с клавиатуры и сообщает выбранную тему наружу', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ThemeToggle onToggle={onToggle} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledWith('dark');
    // наблюдатель темы догоняет DOM следующим тактом — дожидаемся его здесь
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));
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

    await toggleAndSettle(user, 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    vi.restoreAllMocks();
  });
});
