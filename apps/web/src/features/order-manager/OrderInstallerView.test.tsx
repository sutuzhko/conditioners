import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/* 🔴 Полоса действия зовёт `useRouter().refresh()` после удачного перехода:
   наряд перечитывается страницей, а не подменяется в памяти компонента. */
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { OrderInstallerView } from './OrderInstallerView';
import { orderManagerContent as texts } from './content';
import { installerContent as own } from './installer-content';
import { acceptingApi, failingApi, installerCompanyOrder, installerOrder, order } from './fixtures';

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

  it('выплата монтажнику видна всегда: это его деньги', () => {
    render(<OrderInstallerView order={installerCompanyOrder} api={acceptingApi} />);

    expect(screen.getByText(texts.installerFee)).toBeInTheDocument();
  });

  it('телефон клиента — ссылка для звонка с объекта', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(
      screen.getByRole('link', { name: own.callLabel(installerOrder.client.name) }),
    ).toHaveAttribute('href', 'tel:+79101552468');
  });

  it('маршрут ведёт на карту по адресу объекта', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    const route = screen.getByRole('link', { name: own.routeLabel(installerOrder.address) });

    expect(route.getAttribute('href')).toContain(encodeURIComponent(installerOrder.address));
  });

  it('высотные работы вынесены в предупреждения: это про страховку', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.getByText(own.heightWorksNote)).toBeInTheDocument();
  });

  it('🔴 назначенный наряд предлагает одно действие — принять в работу', async () => {
    const user = userEvent.setup();
    const setStatus = vi.fn(async () => ({ ok: true }) as const);

    render(<OrderInstallerView order={installerOrder} api={{ ...acceptingApi, setStatus }} />);

    await user.click(screen.getByRole('button', { name: own.take }));

    expect(setStatus).toHaveBeenCalledWith(installerOrder.id, 'in_progress');
  });

  it('сообщает наверх, что наряд изменился', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<OrderInstallerView order={installerOrder} api={acceptingApi} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: own.take }));

    expect(onChanged).toHaveBeenCalled();
  });

  it('🔴 отказ сервера объясняется словами, а не молчанием', async () => {
    const user = userEvent.setup();

    render(<OrderInstallerView order={installerOrder} api={failingApi} />);

    await user.click(screen.getByRole('button', { name: own.take }));

    expect(await screen.findByRole('alert')).toHaveTextContent('недоступен');
  });

  it('🔴 наряд в работе ведёт на сдачу, а не закрывается прямо здесь', () => {
    render(
      <OrderInstallerView
        order={{ ...installerOrder, status: 'in_progress' }}
        api={acceptingApi}
      />,
    );

    expect(screen.getByRole('link', { name: own.finish })).toHaveAttribute(
      'href',
      `/admin/orders/${installerOrder.id}/handover`,
    );
    expect(screen.getByText(own.finishHint)).toBeInTheDocument();
  });

  it('🔴 сданный наряд монтажник в работу не возвращает', () => {
    render(<OrderInstallerView order={{ ...installerOrder, status: 'done' }} api={acceptingApi} />);

    expect(screen.queryByRole('button', { name: own.take })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: own.openHandover })).toBeInTheDocument();
  });

  it('позиции наряда видны с условиями: чьё оборудование и есть ли штроба', () => {
    render(<OrderInstallerView order={installerOrder} api={acceptingApi} />);

    expect(screen.getByText(own.unitsTitle)).toBeInTheDocument();
    expect(screen.getAllByText(own.sourceMark('ours')).length).toBeGreaterThan(0);
  });
});
