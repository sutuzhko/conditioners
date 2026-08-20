import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { LeadForm } from './LeadForm';
import { leadFormContent as texts } from './content';
import { descriptionFixture, phoneFixture, policyHrefFixture, titleFixture } from './fixtures';
import type { LeadSubmit } from './model';

/** Заявка «уходит» мгновенно: историю смотрят глазами, а не секундомером. */
const acceptingSubmit: LeadSubmit = () => Promise.resolve({ ok: true, id: 'demo' });

/** Отправка, которая не завершается: так видно состояние «отправляем». */
const hangingSubmit: LeadSubmit = () => new Promise(() => {});

const rejectingSubmit: LeadSubmit = () =>
  Promise.resolve({ ok: false, message: 'Похоже, в номере не хватает цифр', field: 'phone' });

const rateLimitedSubmit: LeadSubmit = () =>
  Promise.resolve({ ok: false, message: texts.errorRateLimited });

/** Заполняет обязательные поля и отправляет форму. */
async function fillAndSend(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Имя/), 'Ирина');
  await userEvent.type(canvas.getByLabelText(/Телефон/), '+7 900 123-45-67');
  await userEvent.click(canvas.getByRole('checkbox'));
  await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
}

const meta = {
  title: 'Фичи/Форма заявки',
  component: LeadForm,
  args: {
    phone: phoneFixture,
    policyHref: policyHrefFixture,
    title: titleFixture,
    description: descriptionFixture,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof LeadForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пустая форма',
};

export const Prefilled: Story = {
  name: 'Тема выбрана заранее',
  args: {
    defaultTopic: 'Сервис и ремонт',
    title: 'Нужен ремонт кондиционера?',
    description: 'Опишите симптом — приедем на диагностику.',
  },
};

export const Invalid: Story = {
  name: 'Ошибки валидации',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
    await expect(canvas.getByLabelText(/Имя/)).toHaveAttribute('aria-invalid', 'true');
  },
};

export const Sending: Story = {
  name: 'Отправка',
  args: { submit: hangingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};

export const Success: Story = {
  name: 'Заявка принята',
  args: { submit: acceptingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    await expect(within(canvasElement).getByText(texts.successTitle)).toBeInTheDocument();
  },
};

export const ServerError: Story = {
  name: 'Ошибка сервера',
  args: { submit: rateLimitedSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    await expect(within(canvasElement).getByText(texts.errorRateLimited)).toBeInTheDocument();
  },
};

export const FieldRejectedByServer: Story = {
  name: 'Сервер отверг поле',
  args: { submit: rejectingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};
