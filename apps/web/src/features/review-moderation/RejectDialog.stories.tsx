import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RejectDialog } from './RejectDialog';

const meta = {
  title: 'Админка/Окно отказа отзыва',
  component: RejectDialog,
  args: {
    open: true,
    name: 'Аноним',
    onCancel: () => {},
    onConfirm: () => {},
  },
} satisfies Meta<typeof RejectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Пустое поле — так окно и открывается.
 *
 * 🔴 Кнопка отказа не заблокирована: серый прямоугольник не объясняет, чего
 * от человека хотят. Ошибка появляется по нажатию, как в остальных формах.
 */
export const Пустое: Story = {};

/** Отправка идёт: обе кнопки выключены, чтобы отказ не ушёл дважды. */
export const Отправка: Story = {
  args: { busy: true },
};
