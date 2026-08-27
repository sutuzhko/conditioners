import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StockMoveForm } from './StockMoveForm';
import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import {
  acceptingApi,
  failingApi,
  itemRefs,
  moveDraft,
  pendingApi,
  warehouse,
  zones,
} from './fixtures';

const meta = {
  title: 'Админка/Склад · Движение',
  component: StockMoveForm,
  args: { items: itemRefs, zones, api: acceptingApi },
} satisfies Meta<typeof StockMoveForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Приход: позиция, количество, зона. Накладную разбирать не нужно (ADR-134). */
export const Приход: Story = {};

/** Позиция известна из карточки: списком из одного пункта её не подменяют. */
export const ИзвестнаяПозиция: Story = {
  args: { items: itemRefs.slice(0, 1) },
};

/** Перемещение: добавляется зона-источник — утром загрузили машину. */
export const Перемещение: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.selectOptions(
      within(canvasElement).getByLabelText(texts.moveKind),
      STOCK_MOVE_TITLES.transfer,
    );
  },
};

/** 🔴 Инвентаризация: поправка со знаком и обязательное основание. */
export const Инвентаризация: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.selectOptions(
      within(canvasElement).getByLabelText(texts.moveKind),
      STOCK_MOVE_TITLES.count,
    );
  },
};

/** Отправка идёт: поля и кнопка заблокированы, подпись объясняет состояние. */
export const Отправка: Story = {
  args: { api: pendingApi, items: itemRefs.slice(0, 1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/^Количество/), '12,5');
    await userEvent.selectOptions(canvas.getByLabelText(texts.moveTo), warehouse.name);
    await userEvent.click(canvas.getByRole('button', { name: texts.moveSubmit }));
  },
};

/** Сервер отказал: ошибка объясняет, что делать дальше. */
export const ОтказСервера: Story = {
  args: { api: failingApi, items: itemRefs.slice(0, 1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/^Количество/), '12,5');
    await userEvent.selectOptions(canvas.getByLabelText(texts.moveTo), warehouse.name);
    await userEvent.click(canvas.getByRole('button', { name: texts.moveSubmit }));
  },
};

/** 🔴 Зон нет — проводить движение некуда, и форма говорит об этом прямо. */
export const БезЗон: Story = {
  args: { zones: [] },
};

/** Справочник пуст — проводить движение нечего. */
export const БезПозиций: Story = {
  args: { items: [] },
};

/** Зона одна: перемещать некуда, и кнопка это объясняет. */
export const ОднаЗона: Story = {
  args: { zones: [warehouse] },
  play: async ({ canvasElement }) => {
    await userEvent.selectOptions(
      within(canvasElement).getByLabelText(texts.moveKind),
      STOCK_MOVE_TITLES.transfer,
    );
  },
};

/**
 * После перетаскивания ячейки: позиция и обе зоны пришли адресом, вводят одно
 * количество — туда же встаёт курсор (ADR-137).
 */
export const ПослеПеретаскивания: Story = {
  args: { items: itemRefs.slice(0, 1), initial: moveDraft, autoFocusQty: true },
};

/** В окне формa приходит без своей карточки: рамку и заголовок даёт окно. */
export const БезРамки: Story = {
  args: { items: itemRefs.slice(0, 1), initial: moveDraft, surface: 'bare' },
};
