import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StaffCreateForm } from './StaffCreateForm';
import { staffManagerContent as texts } from './content';
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

/**
 * Выбрали самозанятость, ИНН не заполнили — форма предупреждает сразу, а не
 * после сохранения: узнать статус человека без номера будет нечем.
 */
export const СамозанятыйБезИНН: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText(texts.employment), 'self_employed');
  },
};

/** Сервер назвал поле — подсветка встаёт на логин. */
export const ЗанятыйЛогин: Story = {
  args: { api: fieldRefusingApi },
};

/** Отказ без названия поля: сообщение под формой, форма остаётся заполненной. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
};
