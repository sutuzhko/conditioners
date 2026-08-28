import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StaffCreateModal } from './StaffCreateModal';
import { staffManagerContent as texts } from './content';
import { acceptingApi, failingApi, fieldRefusingApi } from './fixtures';

/**
 * Окно заведения монтажника (ADR-117).
 *
 * Адрес у окна свой — в приложении его рисует перехватывающий маршрут, а
 * прямой заход по тому же адресу отдаёт страницу. В истории показано само
 * окно: маршрут задаёт раздел.
 */
const meta = {
  title: 'Админка/Новый монтажник',
  component: StaffCreateModal,
  parameters: { layout: 'fullscreen' },
  args: { api: acceptingApi },
} satisfies Meta<typeof StaffCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Оформление пустое: человека заводят по телефону, договор подписывают позже. */
export const Пустое: Story = {};

/**
 * Выбрали самозанятость, ИНН не заполнили — окно предупреждает сразу, а не
 * после сохранения: узнать статус человека без номера будет нечем (ADR-144).
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
