import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderFilters } from './OrderFilters';

const meta = {
  title: 'Админка/Заказы/Фильтр заказов',
  component: OrderFilters,
  args: { tab: 'active', period: 'all', query: '', total: 12 },
} satisfies Meta<typeof OrderFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Идёт поиск: рядом с числом найденного появляется сброс фильтра. */
export const СПоиском: Story = {
  args: { tab: 'all', period: 'month', query: 'Первомайская', total: 1 },
};

export const Отказы: Story = {
  args: { tab: 'cancelled', period: 'prev', total: 3 },
};

/** Ничего не нашлось: счётчик обязан честно показать ноль. */
export const НичегоНеНашлось: Story = {
  args: { tab: 'history', query: '9999', total: 0 },
};
