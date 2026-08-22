import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ReminderForm, type ReminderSubmit } from './ReminderForm';
import { reminderFormContent as texts } from './content';
import { phoneFixture, policyHrefFixture } from './fixtures';

/** Напоминание «уходит» мгновенно: историю смотрят глазами, а не секундомером. */
const acceptingSubmit: ReminderSubmit = () => Promise.resolve({ ok: true, id: 'demo' });

/** Отправка, которая не завершается: так видно состояние «отправляем». */
const hangingSubmit: ReminderSubmit = () => new Promise(() => {});

const rateLimitedSubmit: ReminderSubmit = () =>
  Promise.resolve({ ok: false, message: texts.errorRateLimited });

/** Заполняет форму и отправляет. */
async function fillAndSend(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Телефон/), '+7 905 123-45-67');
  await userEvent.click(canvas.getByRole('checkbox'));
  await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
}

/**
 * Форма живёт на тёмной панели в обеих темах, поэтому история показывает её
 * на такой же подложке: на белом фоне поля выглядели бы иначе, чем на сайте.
 */
const meta = {
  title: 'Фичи/Напоминание о ТО',
  component: ReminderForm,
  args: { policyHref: policyHrefFixture, phone: phoneFixture, submit: acceptingSubmit },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 420,
          padding: 28,
          borderRadius: 24,
          background: 'var(--panel)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReminderForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: 'Пустая форма' };

export const Sending: Story = {
  name: 'Отправляем',
  args: { submit: hangingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: texts.submitting })).toBeDisabled();
  },
};

export const Success: Story = {
  name: 'Отправлено',
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    await expect(within(canvasElement).getByText(texts.successTitle)).toBeInTheDocument();
  },
};

export const RateLimited: Story = {
  name: 'Слишком часто',
  args: { submit: rateLimitedSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Не получается/)).toBeInTheDocument();
  },
};

export const WithoutPhone: Story = {
  name: 'Без телефона компании',
  args: { phone: undefined, submit: rateLimitedSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    // запасного пути нет: номер компании выдумывать нельзя (инвариант 8)
    await expect(within(canvasElement).queryByText(/Не получается/)).toBeNull();
  },
};
