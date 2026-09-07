import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/* Шапка зовёт роутер сама, когда её не снабдили переходами: карточка
   серверная и функцию через границу передать не может. */
const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));

import { orderManagerContent as texts } from './content';
import { acceptingApi, cancelledOrder, doneOrder, failingApi, order } from './fixtures';
import { OrderOwnerActions } from './OrderOwnerActions';

/** Подтверждение выведено пропом: тест не открывает диалог кита. */
const agree = async (): Promise<boolean> => true;
const refuse = async (): Promise<boolean> => false;

describe('Действия над нарядом', () => {
  it('🔴 закрывает наряд одним нажатием: статус уходит на сервер', async () => {
    const setStatus = vi.fn(acceptingApi.setStatus);
    const onChanged = vi.fn();

    render(
      <OrderOwnerActions
        order={order}
        api={{ ...acceptingApi, setStatus }}
        onChanged={onChanged}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.markDone }));

    expect(setStatus).toHaveBeenCalledWith(order.id, 'done');
    expect(onChanged).toHaveBeenCalled();
  });

  it('🔴 у выполненного наряда кнопки закрытия нет: закрывать нечего', () => {
    render(<OrderOwnerActions order={doneOrder} api={acceptingApi} />);

    expect(screen.queryByRole('button', { name: texts.markDone })).not.toBeInTheDocument();
  });

  it('🔴 отказ не «выполняют» задним числом: отказ молча стал бы выручкой', () => {
    render(<OrderOwnerActions order={cancelledOrder} api={acceptingApi} />);

    expect(screen.queryByRole('button', { name: texts.markDone })).not.toBeInTheDocument();
  });

  it('правка — ссылка на свой адрес, а не кнопка с переходом', () => {
    render(<OrderOwnerActions order={order} api={acceptingApi} />);

    expect(screen.getByRole('link', { name: texts.edit })).toHaveAttribute(
      'href',
      `/admin/orders/${order.id}/edit`,
    );
  });

  it('🔴 удаление спрашивает подтверждение и уводит из карточки', async () => {
    const remove = vi.fn(acceptingApi.remove);
    const onRemoved = vi.fn();

    render(
      <OrderOwnerActions
        order={order}
        api={{ ...acceptingApi, remove }}
        confirm={agree}
        onRemoved={onRemoved}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.cardActions(order.number) }));
    await userEvent.click(screen.getByRole('menuitem', { name: texts.remove }));

    expect(remove).toHaveBeenCalledWith(order.id);
    expect(onRemoved).toHaveBeenCalled();
  });

  it('🔴 отказ от подтверждения ничего не удаляет', async () => {
    const remove = vi.fn(acceptingApi.remove);

    render(<OrderOwnerActions order={order} api={{ ...acceptingApi, remove }} confirm={refuse} />);

    await userEvent.click(screen.getByRole('button', { name: texts.cardActions(order.number) }));
    await userEvent.click(screen.getByRole('menuitem', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('отказ сервера объясняется словами и звучит для читалки', async () => {
    render(<OrderOwnerActions order={order} api={failingApi} />);

    await userEvent.click(screen.getByRole('button', { name: texts.markDone }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('состояние и вид работ названы плашками', () => {
    render(<OrderOwnerActions order={order} api={acceptingApi} />);

    expect(screen.getByText('Назначен')).toBeInTheDocument();
    expect(screen.getByText('Монтаж')).toBeInTheDocument();
  });
});
