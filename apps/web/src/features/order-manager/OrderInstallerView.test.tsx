import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderInstallerView } from './OrderInstallerView';
import { ORDER_STATUS_TITLE, orderManagerContent as texts } from './content';
import {
  acceptingApi,
  failingApi,
  installerCompanyOrder,
  installerOrder,
  installerOvertimeOrder,
  order,
} from './fixtures';

describe('Наряд у монтажника', () => {
  it('🔴 не показывает заметку владельца и удержание, даже если они пришли', () => {
    /* Наряд владельца целиком: сервер такого монтажнику не отдаёт, но
       разграничение не должно держаться на одной только форме ответа. */
    const leaked = { ...order, deductionSum: 2000, deductionReason: 'Брак монтажа' };

    render(<OrderInstallerView order={leaked} api={acceptingApi} />);

    expect(screen.queryByText(texts.ownerNote)).not.toBeInTheDocument();
    expect(screen.queryByText(/Клиент постоянный/)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.deduction)).not.toBeInTheDocument();
    expect(screen.queryByText(/Брак монтажа/)).not.toBeInTheDocument();
  });

  it('🔴 сумму заказа показывает только при оплате наличными', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.getByText(texts.cashToTake)).toBeInTheDocument();
    expect(screen.getByText(/38/)).toBeInTheDocument();
  });

  it('🔴 платит компания — суммы заказа на экране нет', () => {
    render(<OrderInstallerView order={installerCompanyOrder} api={acceptingApi} />);

    expect(screen.queryByText(texts.cashToTake)).not.toBeInTheDocument();
  });

  it('🔴 свою переработку монтажник видит: это его часы, а не деньги компании', () => {
    render(<OrderInstallerView order={installerOvertimeOrder} api={acceptingApi} />);

    expect(screen.getByText(texts.overtime(2 * 60 + 15))).toBeInTheDocument();
  });

  it('без переработки строки нет', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.queryByText(/Переработка/)).not.toBeInTheDocument();
  });

  it('выплата монтажнику видна всегда: это его деньги', () => {
    render(<OrderInstallerView order={installerCompanyOrder} api={acceptingApi} />);

    expect(screen.getByText(texts.installerFee)).toBeInTheDocument();
  });

  it('🔴 в переходах статуса только «В работе» и «Выполнен»', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    const select = screen.getByLabelText(texts.statusTitle);
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(options).toContain(ORDER_STATUS_TITLE.in_progress);
    expect(options).toContain(ORDER_STATUS_TITLE.done);
    expect(options).not.toContain(ORDER_STATUS_TITLE.cancelled);
    expect(options).not.toContain(ORDER_STATUS_TITLE.assigned);
  });

  it('отмечает выезд: статус уходит на сервер и обновляется на экране', async () => {
    const user = userEvent.setup();
    const setStatus = vi.fn(async () => ({ ok: true }) as const);

    render(<OrderInstallerView order={installerOrder} api={{ ...acceptingApi, setStatus }} />);

    await user.selectOptions(screen.getByLabelText(texts.statusTitle), 'in_progress');

    expect(setStatus).toHaveBeenCalledWith(installerOrder.id, 'in_progress');
    expect(await screen.findByText(texts.statusSaved)).toBeInTheDocument();
    // «В работе» есть и в плашке статуса, и в списке переходов — сверяем поле
    expect(screen.getByLabelText(texts.statusTitle)).toHaveValue('in_progress');
  });

  it('сообщает наверх, что наряд изменился', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<OrderInstallerView order={installerOrder} api={acceptingApi} onChanged={onChanged} />);

    await user.selectOptions(screen.getByLabelText(texts.statusTitle), 'done');

    expect(onChanged).toHaveBeenCalled();
  });

  it('🔴 отказ сервера возвращает прежний статус: врать монтажнику нельзя', async () => {
    const user = userEvent.setup();

    render(<OrderInstallerView order={installerOrder} api={failingApi} />);

    await user.selectOptions(screen.getByLabelText(texts.statusTitle), 'done');

    expect(await screen.findByRole('alert')).toHaveTextContent('недоступен');
    expect(screen.getByText(ORDER_STATUS_TITLE.assigned)).toBeInTheDocument();
  });

  it('телефон клиента — ссылка для звонка с объекта', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.getByRole('link', { name: /910/ })).toHaveAttribute('href', 'tel:+79101552468');
  });

  it('высотные работы вынесены отдельной строкой: это про страховку', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.getByText(texts.heightWorksOn)).toBeInTheDocument();
  });
});
