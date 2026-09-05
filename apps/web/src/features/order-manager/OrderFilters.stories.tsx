import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderFilters } from './OrderFilters';
import { installers, listFilters } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Фильтр заказов',
  component: OrderFilters,
  args: { filters: listFilters(), installers, total: 12 },
} satisfies Meta<typeof OrderFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Идёт поиск: применённые условия остаются плашками и снимаются по одному. */
export const СПоиском: Story = {
  args: {
    filters: listFilters({ tab: 'all', period: 'month', query: 'Первомайская' }),
    total: 1,
  },
};

export const Отказы: Story = {
  args: { filters: listFilters({ tab: 'cancelled', period: 'prev' }), total: 3 },
};

/** Фильтр по монтажнику: третья плашка условий (issue #594). */
export const ПоМонтажнику: Story = {
  args: {
    filters: listFilters({ tab: 'all', installer: installers[0]?.id ?? '' }),
    total: 4,
  },
};

/** Ничего не нашлось: счётчик обязан честно показать ноль. */
export const НичегоНеНашлось: Story = {
  args: { filters: listFilters({ tab: 'history', query: '9999' }), total: 0 },
};
