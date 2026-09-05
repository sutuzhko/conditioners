import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderList } from './OrderList';
import {
  declinedPage,
  emptyPage,
  historyPage,
  installers,
  listFilters,
  longPage,
  page,
} from './fixtures';

const meta = {
  title: 'Админка/Заказы/Список нарядов',
  component: OrderList,
  args: { page, filters: listFilters(), installers },
} satisfies Meta<typeof OrderList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Список перерос страницу: появляются номера страниц и «Строк на странице». */
export const СоСтраницами: Story = {
  args: { page: longPage, filters: listFilters({ tab: 'all', query: 'Соколова' }) },
};

/**
 * Вкладка «Новые»: плашка о том, чем грозит наряд без исполнителя, и своё
 * действие в каждой строке.
 */
export const ВкладкаНовые: Story = {
  args: { filters: listFilters({ tab: 'new' }) },
};

/** Вкладка «История»: итог периода над таблицей — сколько закрыто и на сколько. */
export const ВкладкаИстория: Story = {
  args: {
    page: historyPage,
    filters: listFilters({ tab: 'history', period: 'month' }),
    totals: { closed: 18, revenue: 612_400 },
  },
};

/** Вкладка «Отказы»: причина и возврат в работу, выбора строк здесь нет. */
export const ВкладкаОтказы: Story = {
  args: { page: declinedPage, filters: listFilters({ tab: 'cancelled' }) },
};

/** Нарядов нет вовсе — это приглашение завести первый. */
export const Пусто: Story = {
  args: { page: emptyPage },
};

/** 🔴 Пусто по фильтру — другая новость: наряд лежит в другой стопке. */
export const ПустоПоФильтру: Story = {
  args: { page: emptyPage, filters: listFilters({ tab: 'cancelled', period: 'prev' }) },
};

/** Экран монтажника: у пустоты там своя причина. */
export const ПустоУМонтажника: Story = {
  args: { page: emptyPage, forInstaller: true },
};
