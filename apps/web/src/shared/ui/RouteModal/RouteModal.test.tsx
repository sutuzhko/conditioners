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

  it('🔴 несохранённый ввод не уходит молча: окно спрашивает', async () => {
    back.mockClear();
    historyLength(3);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock" dirty>
        <p>Форма</p>
      </RouteModal>,
    );
    await userEvent.keyboard('{Escape}');

    /* Человек, потерявший заполненную форму случайным нажатием, второй раз
       её не заполнит — он позвонит. */
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Остаться' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it('на второй вопрос «закрыть без сохранения» окно уходит', async () => {
    back.mockClear();
    historyLength(3);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock" dirty>
        <p>Форма</p>
      </RouteModal>,
    );
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть без сохранения' }));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('пустая форма закрывается сразу — спрашивать не о чем', async () => {
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

  /**
   * 🔴 Два Escape подряд — это и есть то случайное нажатие, ради которого
   * вопрос заведён. Пока он показан, Escape означает «остаться»: уйти можно
   * только назвав это словом.
   */
  it('второй Escape при открытом вопросе не теряет введённое', async () => {
    back.mockClear();
    historyLength(3);

    render(
      <RouteModal title="Новая позиция" fallbackHref="/admin/stock" dirty>
        <p>Форма</p>
      </RouteModal>,
    );

    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(back).not.toHaveBeenCalled();
    // вопрос убран — человек снова в форме, а не за её пределами
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // уйти по-прежнему можно — но только назвав это словом
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть без сохранения' }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
