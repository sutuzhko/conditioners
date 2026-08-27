import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StockItemForm } from './StockItemForm';
import { stockManagerContent as texts } from './content';
import { acceptingApi, archivedItem, failingApi, pendingApi, pipe, products } from './fixtures';
import { itemDraftOf } from './model';

const meta = {
  title: 'Админка/Склад · Позиция справочника',
  component: StockItemForm,
  args: { api: acceptingApi, products, confirmArchive: async () => true },
} satisfies Meta<typeof StockItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Заведение: пустая форма над таблицей остатков. */
export const Заведение: Story = {};

/** Правка заведённой позиции: появляется сдача в архив. */
export const Правка: Story = {
  args: {
    itemId: pipe.id,
    initial: itemDraftOf(pipe),
    title: texts.itemCardTitle,
    hint: texts.itemCardHint,
    archivable: true,
  },
};

/** Позиция в архиве: из остатков ушла, журнал остался, вернуть можно. */
export const ВАрхиве: Story = {
  args: {
    itemId: archivedItem.id,
    initial: itemDraftOf(archivedItem),
    title: texts.itemCardTitle,
    hint: texts.itemCardHint,
    archivable: true,
  },
};

/** Отправка идёт: кнопка заблокирована, подпись объясняет состояние. */
export const Отправка: Story = {
  args: { api: pendingApi },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(texts.itemName), 'Труба медная 1/4″');
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.itemAdd }));
  },
};

/** Сервер назвал поле: ошибка стоит под ним, а не в общей строке. */
export const ЗанятоеНазвание: Story = {
  args: { api: failingApi },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(texts.itemName), 'Труба медная 1/4″');
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.itemAdd }));
  },
};

/** Каталог пуст: остаётся единственный вариант — расходник. */
export const БезКаталога: Story = {
  args: { products: [] },
};
