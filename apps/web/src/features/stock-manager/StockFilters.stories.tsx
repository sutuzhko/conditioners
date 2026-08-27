import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockFilters } from './StockFilters';
import { overview } from './fixtures';

const meta = {
  title: 'Админка/Склад · Фильтры',
  component: StockFilters,
  args: {
    filters: { query: '', group: '', low: false, archived: false },
    groups: overview.groups,
    total: 4,
    lowCount: 1,
  },
} satisfies Meta<typeof StockFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Выбрана группа: остаётся кнопка сброса. */
export const ПоГруппе: Story = {
  args: { filters: { query: '', group: 'Крепёж', low: false, archived: false }, total: 1 },
};

/** «Только к заказу» — список закупки без отдельного экрана. */
export const ТолькоКЗаказу: Story = {
  args: { filters: { query: '', group: '', low: true, archived: false }, total: 1 },
};

/** Поиск: подпись под фильтром меняется с «всего» на «найдено». */
export const Поиск: Story = {
  args: { filters: { query: 'труба', group: '', low: false, archived: false }, total: 2 },
};

/** Архив: позиции, которыми больше не пользуются, но история их движений жива. */
export const Архив: Story = {
  args: { filters: { query: '', group: '', low: false, archived: true }, total: 1 },
};

/** Ниже порога ничего нет — спокойное состояние. */
export const БезЗакупки: Story = {
  args: { lowCount: 0 },
};

/** Групп ещё не завели: остаётся один чип «Все группы». */
export const БезГрупп: Story = {
  args: { groups: [], total: 0, lowCount: 0 },
};

/**
 * Монтажнику порог заказа не приходит вовсе — строки про закупку нет
 * (docs/API.md §14).
 */
export const БезПорога: Story = {
  args: { lowCount: undefined },
};
