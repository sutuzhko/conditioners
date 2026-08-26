import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffCreateForm } from './StaffCreateForm';
import { acceptingApi, failingApi, fieldRefusingApi } from './fixtures';

const meta = {
  title: 'Админка/Новый монтажник',
  component: StaffCreateForm,
  args: { api: acceptingApi },
} satisfies Meta<typeof StaffCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Оформление пустое: человека заводят по телефону, договор подписывают позже. */
export const Пустая: Story = {};

/** Сервер назвал поле — подсветка встаёт на логин. */
export const ЗанятыйЛогин: Story = {
  args: { api: fieldRefusingApi },
};

/** Отказ без названия поля: сообщение под формой, форма остаётся заполненной. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
};
