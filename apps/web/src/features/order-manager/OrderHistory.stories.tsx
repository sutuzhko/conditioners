import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderHistory } from './OrderHistory';
import { history } from './fixtures';

const meta = {
  title: 'Админка/Заказы/История наряда',
  component: OrderHistory,
  args: { entries: history },
} satisfies Meta<typeof OrderHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Свежие записи сверху: последнее событие читают первым. */
export const Базовое: Story = {};

/** Записей нет: наряд только что завели, а история ещё не доехала. */
export const Пусто: Story = {
  args: { entries: [] },
};

/** Автор удалён из панели — запись остаётся, подпись меняется. */
export const БезАвтора: Story = {
  args: { entries: history.map((entry) => ({ ...entry, author: null })) },
};
