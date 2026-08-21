import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { ProductForm } from './ProductForm';
import { productFormContent as texts } from './content';
import { acceptingSave, failingSave, filledProduct, pendingSave, rejectingSave } from './fixtures';
import { emptyProductValues } from './model';

const meta = {
  title: 'Админка/Модель каталога',
  component: ProductForm,
  args: { values: filledProduct, save: acceptingSave },
} satisfies Meta<typeof ProductForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Существующая модель: есть и сохранение, и удаление. */
export const Базовое: Story = {
  args: { remove: async () => ({ ok: true }) },
};

/** Новая модель: пустые поля, кнопка «Создать», удалять нечего. */
export const НоваяМодель: Story = {
  args: { values: emptyProductValues, isNew: true },
};

/** Модель без характеристик не попадёт в таблицу сравнения — предупреждаем. */
export const БезХарактеристик: Story = {
  args: { values: { ...filledProduct, specs: [] } },
};

export const Сохранение: Story = {
  args: { save: pendingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};

export const ОшибкаПоля: Story = {
  args: { save: rejectingSave },
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
