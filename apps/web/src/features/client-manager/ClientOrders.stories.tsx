import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientOrders } from './ClientOrders';
import { clientOrders, pricelessOrder } from './fixtures';

const ALL = { pathname: '/admin/orders', query: { q: 'Соколов', tab: 'all' } };

/** История заказов клиента (CRM.md §3.2, issue #350). */
const meta = {
  title: 'Админка/История заказов клиента',
  component: ClientOrders,
  args: { orders: { items: clientOrders, total: clientOrders.length }, allHref: ALL },
} satisfies Meta<typeof ClientOrders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Наряд без проставленной цены — прочерк, а не ноль: работа не бесплатная. */
export const БезЦены: Story = {
  args: { orders: { items: [pricelessOrder], total: 1 } },
};

/** Показаны последние: строка говорит, сколько осталось за кадром. */
export const ЕстьЕщё: Story = {
  args: { orders: { items: clientOrders, total: 57 } },
};

/** У человека работ ещё не было: карточка объясняет, откуда берётся первая. */
export const Пусто: Story = {
  args: { orders: { items: [], total: 0 } },
};
