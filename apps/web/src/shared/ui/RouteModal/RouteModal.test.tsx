import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RouteModal } from './RouteModal';

const back = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, replace }),
}));

function historyLength(length: number): void {
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(length);
}

describe('RouteModal', () => {
  it('рисует содержимое окном с заголовком', () => {
    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock">
        <p>Форма</p>
      </RouteModal>,
    );

    expect(screen.getByRole('dialog', { name: 'Новая позиция' })).toBeInTheDocument();
    expect(screen.getByText('Форма')).toBeInTheDocument();
  });

  it('закрытие — шаг назад: адрес окна уходит из истории, список остаётся', async () => {
    back.mockClear();
    historyLength(3);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock">
        <p>Форма</p>
      </RouteModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('🔴 вкладку открыли прямо на адресе окна — уходим на запасной адрес', async () => {
    back.mockClear();
    replace.mockClear();
    historyLength(1);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock">
        <p>Форма</p>
      </RouteModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    /* Шага назад тут нет, и без запасного адреса кнопка выглядела бы сломанной. */
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/admin/stock');
  });

  it('закрывается с клавиатуры', async () => {
    back.mockClear();
    historyLength(3);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock">
        <p>Форма</p>
      </RouteModal>,
    );
    await userEvent.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
  });
});
