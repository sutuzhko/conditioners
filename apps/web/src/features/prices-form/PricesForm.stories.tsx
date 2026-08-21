import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { PricesForm } from './PricesForm';
import { pricesFormContent as texts } from './content';
import {
  acceptingSave,
  emptyExtras,
  emptyPrices,
  failingSave,
  filledPrices,
  pendingSave,
} from './fixtures';

const meta = {
  title: 'Админка/Цены на монтаж',
  component: PricesForm,
  args: { values: filledPrices, save: acceptingSave },
} satisfies Meta<typeof PricesForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Ставки не заданы: поля пустые, нулей вместо них не подставляем. */
export const БезСтавок: Story = {
  args: { values: emptyExtras },
};

/** Прайс пуст — калькулятору на сайте нечего считать. */
export const ПустойПрайс: Story = {
  args: { values: emptyPrices },
};

export const Сохранение: Story = {
  args: { save: pendingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};

export const ОтказСервера: Story = {
  args: { save: failingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};
