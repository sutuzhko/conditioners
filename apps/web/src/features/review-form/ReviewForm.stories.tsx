import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ReviewForm } from './ReviewForm';
import { reviewFormContent as texts } from './content';
import { policyHrefFixture } from './fixtures';
import type { ReviewSubmit } from './model';

/** Отзыв «уходит» мгновенно: историю смотрят глазами, а не секундомером. */
const acceptingSubmit: ReviewSubmit = () => Promise.resolve({ ok: true, id: 'demo' });

/** Отправка, которая не завершается: так видно состояние «отправляем». */
const hangingSubmit: ReviewSubmit = () => new Promise(() => {});

const rateLimitedSubmit: ReviewSubmit = () =>
  Promise.resolve({ ok: false, message: texts.errorRateLimited });

const rejectingSubmit: ReviewSubmit = () =>
  Promise.resolve({
    ok: false,
    message: 'Расскажите о работе подробнее — не меньше 10 символов',
    field: 'text',
  });

/** Заполняет обязательные поля и отправляет форму. */
async function fillAndSend(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Имя/), 'Ирина');
  await userEvent.click(canvas.getByRole('radio', { name: 'Оценка 5 из 5' }));
  await userEvent.type(
    canvas.getByLabelText(/Отзыв/),
    'Поставили сплит в спальню, трассу спрятали в короб. Смета совпала с расчётом.',
  );
  await userEvent.click(canvas.getByRole('checkbox'));
  await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
}

const meta = {
  title: 'Фичи/Форма отзыва',
  component: ReviewForm,
  args: { policyHref: policyHrefFixture },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ReviewForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пустая форма',
};

export const Invalid: Story = {
  name: 'Ошибки валидации',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
    await expect(canvas.getByLabelText(/Имя/)).toHaveAttribute('aria-invalid', 'true');
  },
};

/** Оценка обязательна: всё заполнено, звёзды не выбраны — отправки нет. */
export const WithoutRating: Story = {
  name: 'Оценка не выбрана',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/Имя/), 'Ирина');
    await userEvent.type(
      canvas.getByLabelText(/Отзыв/),
      'Монтаж прошёл ровно, но хотелось бы предупреждения о переносе времени.',
    );
    await userEvent.click(canvas.getByRole('checkbox'));
    await userEvent.click(canvas.getByRole('button', { name: texts.submit }));

    await expect(canvas.getByRole('alert')).toHaveTextContent(/Поставьте оценку/);
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
  name: 'Отзыв принят на модерацию',
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
