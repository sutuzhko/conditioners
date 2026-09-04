import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffPayouts } from './StaffPayouts';
import { emptyTotals, orderWithoutReason, staffOrders, staffTotals } from './fixtures';

/**
 * Выплаты и удержания монтажника (CRM.md §3.6, §9, issue #351).
 *
 * 🔴 «Удержание», а не «штраф»: штрафов как вида взыскания в ТК РФ нет. Слова
 * «штраф» нет ни в одной подписи этого экрана.
 */
const meta = {
  title: 'Админка/Выплаты монтажника',
  component: StaffPayouts,
  args: { totals: staffTotals, orders: staffOrders },
} satisfies Meta<typeof StaffPayouts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Удержаний не было: колонка на месте, в ней прочерки. */
export const БезУдержаний: Story = {
  args: {
    totals: { ...staffTotals, deductions: 0 },
    orders: staffOrders.map((order) => ({ ...order, deduction: 0, deductionReason: null })),
  },
};

/** 🔴 Удержание без основания — дефект данных, и экран называет его словами. */
export const УдержаниеБезОснования: Story = {
  args: { orders: [orderWithoutReason] },
};

/** Новый человек: плитки нулевые, движений нет. */
export const Новичок: Story = {
  args: { totals: emptyTotals, orders: [] },
};
