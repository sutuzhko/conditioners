import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { OrderInstallerActions } from './OrderInstallerActions';
import { installerContent as own } from './installer-content';
import { acceptingApi, failingApi, installerOrder, pendingApi } from './fixtures';

/** Нажимает «Принять в работу»: без этого состояние отправки не наступает. */
async function take(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(within(canvasElement).getByRole('button', { name: own.take }));
}

const meta = {
  title: 'Админка/Заказы/Действие монтажника',
  component: OrderInstallerActions,
  args: { orderId: installerOrder.id, status: 'assigned', api: acceptingApi },
} satisfies Meta<typeof OrderInstallerActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Назначен: одно действие — принять в работу. */
export const Назначен: Story = {};

/** 🔴 В работе: кнопка ведёт на сдачу и говорит, что будет дальше. */
export const ВРаботе: Story = {
  args: { status: 'in_progress' },
};

/** Сдан: вернуть наряд в работу может только владелец. */
export const Сдан: Story = {
  args: { status: 'done' },
};

/** Отказ: действий у монтажника нет — это решение владельца. */
export const Отказ: Story = {
  args: { status: 'cancelled' },
};

/** Запрос ушёл и не вернулся: кнопка занята. */
export const Отправка: Story = {
  args: { api: pendingApi },
  play: async ({ canvasElement }) => {
    await take(canvasElement);
  },
};

/** Сервер отказал: причина названа словами. */
export const ОшибкаСервера: Story = {
  args: { api: failingApi },
  play: async ({ canvasElement }) => {
    await take(canvasElement);
  },
};
