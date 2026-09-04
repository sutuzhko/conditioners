import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderTabs } from './OrderTabs';

const meta = {
  title: 'Админка/Заказы/Стопки заказов',
  component: OrderTabs,
  args: { tab: 'active', period: 'all', query: '' },
} satisfies Meta<typeof OrderTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пять стопок; открыты «Активные» — то, ради чего в раздел заходят утром. */
export const Базовое: Story = {};

/** История: сверху то, что закончилось последним. */
export const История: Story = { args: { tab: 'history' } };

/** Отказы за прошлый месяц — тот самый адрес, который присылают ссылкой. */
export const ОтказыЗаПрошлыйМесяц: Story = { args: { tab: 'cancelled', period: 'prev' } };

/** Стопки со включённым поиском: запрос переезжает вместе с вкладкой. */
export const СПоиском: Story = { args: { tab: 'all', query: 'Соколова' } };
