import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { LoginForm } from './LoginForm';
import { adminLoginContent as texts } from './content';
import { failedSubmit, pendingSubmit, rateLimitedSubmit, successSubmit } from './fixtures';

const meta = {
  title: 'Админка/Вход',
  component: LoginForm,
  args: { redirectTo: '/admin', submit: successSubmit },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Заполняет форму и нажимает «Войти». */
async function send(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(new RegExp(texts.login)), 'admin');
  await userEvent.type(canvas.getByLabelText(new RegExp(texts.password)), 'секрет');
  await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
}

export const Базовое: Story = {};

/** Пустая отправка: подписи под полями и фокус на первом непройденном. */
export const НезаполненнаяФорма: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.submit }));
  },
};

export const Отправка: Story = {
  args: { submit: pendingSubmit },
  play: async ({ canvasElement }) => {
    await send(canvasElement);
  },
};

export const НеверныеДанные: Story = {
  args: { submit: failedSubmit },
  play: async ({ canvasElement }) => {
    await send(canvasElement);
  },
};

/** Перебор: сервер просит подождать, и форма говорит сколько. */
export const СлишкомМногоПопыток: Story = {
  args: { submit: rateLimitedSubmit },
  play: async ({ canvasElement }) => {
    await send(canvasElement);
  },
};
