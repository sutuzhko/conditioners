import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockStats } from './StockStats';
import { emptyOverview, noThresholdOverview, overview } from './fixtures';

const meta = {
  title: 'Админка/Склад · Показатели',
  component: StockStats,
  args: { overview },
} satisfies Meta<typeof StockStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный день: одна позиция ниже порога, одна подходит к нему. */
export const Базовое: Story = {};

/** Хорошая новость: заказывать сегодня нечего — плитка это и говорит. */
export const ВсёВНорме: Story = {
  args: { overview: { ...overview, lowCount: 0, nearCount: 0 } },
};

/** Тревога: ниже порога сразу семь позиций — плитка краснеет вся. */
export const МногоКЗаказу: Story = {
  args: { overview: { ...overview, itemsTotal: 42, lowCount: 7, nearCount: 5 } },
};

/** Справочник ещё пуст: остаток появится после первого прихода. */
export const Пусто: Story = {
  args: { overview: emptyOverview },
};

/**
 * 🔴 Глазами монтажника: порога он не видит вовсе — это владельческий ключ
 * (ADR-134). Плиток про порог тогда нет, а не показаны нули.
 */
export const БезПорога: Story = {
  args: { overview: noThresholdOverview },
};
