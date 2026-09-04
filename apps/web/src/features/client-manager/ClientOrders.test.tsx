import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientOrders } from './ClientOrders';
import { clientManagerContent as texts } from './content';
import { clientOrders, doneOrder, pricelessOrder } from './fixtures';

const ALL = { pathname: '/admin/orders', query: { q: 'Соколов', tab: 'all' } };

describe('История заказов клиента', () => {
  it('ведёт в карточку наряда', () => {
    render(<ClientOrders orders={{ items: clientOrders, total: 3 }} allHref={ALL} />);

    expect(
      screen.getByRole('link', { name: new RegExp(texts.orderNumber(doneOrder.number)) }),
    ).toHaveAttribute('href', `/admin/orders/${doneOrder.id}`);
  });

  /* 🔴 Прочерк, а не «0 ₽»: цену ещё не проставили, и ноль на её месте
     означал бы, что работу делают бесплатно. */
  it('🔴 наряд без цены показывает прочерк, а не ноль', () => {
    render(<ClientOrders orders={{ items: [pricelessOrder], total: 1 }} allHref={ALL} />);

    expect(screen.getByText(texts.orderPrice(null))).toBeInTheDocument();
    expect(screen.queryByText(texts.orderPrice(0))).not.toBeInTheDocument();
  });

  it('говорит, сколько нарядов осталось за кадром', () => {
    render(<ClientOrders orders={{ items: clientOrders, total: 57 }} allHref={ALL} />);

    expect(screen.getByText(texts.ordersShown(3, 57))).toBeInTheDocument();
  });

  it('умалчивает о числе, когда показаны все', () => {
    render(<ClientOrders orders={{ items: clientOrders, total: 3 }} allHref={ALL} />);

    expect(screen.queryByText(texts.ordersShown(3, 3))).not.toBeInTheDocument();
  });

  it('пустая история объясняет, откуда берётся первый наряд', () => {
    render(<ClientOrders orders={{ items: [], total: 0 }} allHref={ALL} />);

    expect(screen.getByText(texts.ordersEmpty)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: texts.ordersAll })).not.toBeInTheDocument();
  });
});
