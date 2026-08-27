import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StockItemAdd } from './StockItemAdd';
import { stockManagerContent as texts } from './content';
import { acceptingApi, products } from './fixtures';

const meta = {
  title: 'Админка/Склад · Добавление позиции',
  component: StockItemAdd,
  args: { api: acceptingApi, products },
} satisfies Meta<typeof StockItemAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Свёрнуто: раздел открывают ради остатков, а не ради справочника. */
export const Свёрнуто: Story = {};

export const Развёрнуто: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.itemAddOpen }));
  },
};
