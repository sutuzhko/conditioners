import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StockZoneForm } from './StockZoneForm';
import { stockManagerContent as texts } from './content';
import { acceptingApi, failingApi, pendingApi, people, van } from './fixtures';
import { zoneDraftOf } from './model';

const meta = {
  title: 'Админка/Склад · Форма зоны',
  component: StockZoneForm,
  args: { api: acceptingApi, people },
} satisfies Meta<typeof StockZoneForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Заведение: по умолчанию склад — у него хозяина не бывает. */
export const Заведение: Story = {};

/** Правка машины: хозяин обязателен, и поле уже заполнено. */
export const ПравкаМашины: Story = {
  args: { zoneId: van.id, initial: zoneDraftOf(van), onCancel: () => {} },
};

/** 🔴 Машина без хозяина: схема контракта не пропускает, форма говорит об этом. */
export const МашинаБезХозяина: Story = {
  args: { initial: { kind: 'van', name: 'Газель', userId: '', sort: '1', archived: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.zoneAdd }));
  },
};

/** Отправка идёт: поля и кнопка заблокированы. */
export const Отправка: Story = {
  args: {
    api: pendingApi,
    initial: { kind: 'warehouse', name: 'Гараж', userId: '', sort: '0', archived: false },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.zoneAdd }));
  },
};

/** Сервер отказал: ошибка объясняет, что делать дальше. */
export const ОтказСервера: Story = {
  args: {
    api: { ...failingApi, createZone: async () => ({ ok: false, message: texts.serverError }) },
    initial: { kind: 'warehouse', name: 'Гараж', userId: '', sort: '0', archived: false },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.zoneAdd }));
  },
};

/** Монтажников ещё не завели: закреплять машину не за кем. */
export const БезЛюдей: Story = {
  args: {
    people: [],
    initial: { kind: 'van', name: '', userId: '', sort: '1', archived: false },
  },
};
