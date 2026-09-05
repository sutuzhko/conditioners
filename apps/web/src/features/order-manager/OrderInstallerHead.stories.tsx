import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderInstallerHead } from './OrderInstallerHead';
import { installerCompanyOrder, installerOrder, installerOvertimeOrder } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Шапка наряда монтажника',
  component: OrderInstallerHead,
  args: { order: installerOrder },
} satisfies Meta<typeof OrderInstallerHead>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Назначен: работа, время и номер моноширинной меткой. */
export const Базовое: Story = {};

/** Работа идёт. */
export const ВРаботе: Story = {
  args: { order: { ...installerOrder, status: 'in_progress' } },
};

/** 🔴 Свою переработку монтажник видит: это его часы, а не деньги компании. */
export const СПереработкой: Story = {
  args: { order: installerOvertimeOrder },
};

/** Отказ: ехать не нужно, и это сказано словами, а не одной краской плашки. */
export const Отказ: Story = {
  args: {
    order: { ...installerCompanyOrder, status: 'cancelled', cancelReason: 'postponed' },
  },
};
