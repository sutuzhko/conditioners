import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderCardView } from './OrderCardView';
import { cancelledOrder, freshOrder, longOrder, order, overtimeOrder } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Наряд в списке',
  component: OrderCardView,
  args: { order },
} satisfies Meta<typeof OrderCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Только заведён: монтажник не назначен, позиций ещё нет. */
export const Новый: Story = {
  args: { order: freshOrder },
};

export const Отказ: Story = {
  args: { order: cancelledOrder },
};

/** Длинные адрес и имя не должны рвать карточку. */
export const ДлинныеДанные: Story = {
  args: { order: longOrder },
};

/**
 * Выезд вышел за рабочее окно: переработка стоит рядом с длительностью.
 * Факт, а не обещание доплаты — она решается вместе с расчётами (ADR-138).
 */
export const СПереработкой: Story = {
  args: { order: overtimeOrder },
};
