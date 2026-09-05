import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffLoadBar } from './StaffLoadBar';

/**
 * Загрузка недели (issue #629). Норма — рабочее окно × пять рабочих дней:
 * 09–19 даёт 3000 минут.
 */
const meta = {
  title: 'Админка/Загрузка недели',
  component: StaffLoadBar,
  args: { minutes: 1920, normMin: 3000, overtimeMin: 0 },
} satisfies Meta<typeof StaffLoadBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Свободен: неделя пустая, человеку можно дать выезд. */
export const Пусто: Story = {
  args: { minutes: 0 },
};

export const ПодНорму: Story = {
  args: { minutes: 3000 },
};

/**
 * 🔴 Переработка названа словами, а не отмечена одним цветом: четыре краски
 * различает не всякий глаз, а «44 из 40 ч» без пояснения читается как ошибка
 * ввода (DESIGN_BRIEF §14).
 */
export const Переработка: Story = {
  args: { minutes: 3240, overtimeMin: 240 },
};
