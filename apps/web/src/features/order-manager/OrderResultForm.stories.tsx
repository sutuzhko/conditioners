import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderResultForm } from './OrderResultForm';
import { acceptingWorkApi, failingWorkApi, orderDetails, pendingWorkApi } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Итог работ',
  component: OrderResultForm,
  args: {
    api: acceptingWorkApi,
    extraWork: null,
    report: null,
    resultAt: null,
  },
} satisfies Meta<typeof OrderResultForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустой итог: по наряду ещё не отчитывались. */
export const Базовое: Story = {};

/** Заполненный отчёт: время ставит сервер, форма его только показывает. */
export const Заполнен: Story = {
  args: {
    extraWork: orderDetails.extraWork,
    report: orderDetails.report,
    resultAt: orderDetails.resultAt,
  },
};

/** Отправка: кнопка занята, поля закрыты. */
export const Отправка: Story = {
  args: { api: pendingWorkApi },
};

export const Ошибка: Story = {
  args: { api: failingWorkApi },
};

/** Наряд закрыт правкой сверху: форма отключена целиком. */
export const Отключено: Story = {
  args: { disabled: true },
};
