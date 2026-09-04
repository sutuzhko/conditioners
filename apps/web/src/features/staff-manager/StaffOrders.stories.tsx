import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffOrders } from './StaffOrders';
import { staffOrders } from './fixtures';

const ALL = { pathname: '/admin/orders', query: { q: 'Захаров', tab: 'all' } };

/** Наряды монтажника — вкладка «Заказы» его карточки (CRM.md §3.6). */
const meta = {
  title: 'Админка/Наряды монтажника',
  component: StaffOrders,
  args: { orders: { items: staffOrders, total: staffOrders.length }, allHref: ALL },
} satisfies Meta<typeof StaffOrders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Показаны последние: строка говорит, сколько осталось за кадром. */
export const ЕстьЕщё: Story = {
  args: { orders: { items: staffOrders, total: 96 } },
};

/** Человека ещё ни на что не назначили. */
export const Пусто: Story = {
  args: { orders: { items: [], total: 0 } },
};
