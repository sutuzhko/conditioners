import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockPager } from './StockPager';
import { longOverview, overview } from './fixtures';
import { DEFAULT_STOCK_FILTERS } from './model';

const meta = {
  title: 'Админка/Склад · Разбивка',
  component: StockPager,
  args: { overview: { ...longOverview, itemsTotal: 47 }, filters: DEFAULT_STOCK_FILTERS },
} satisfies Meta<typeof StockPager>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Справочник длиннее страницы: счёт, номера страниц и выбор шага. */
export const Базовое: Story = {};

/** Первая страница: шаг «назад» остаётся на месте, чтобы номера не прыгали. */
export const ПерваяСтраница: Story = {
  args: { overview: { ...longOverview, itemsTotal: 47, page: 1 } },
};

/** Выбран мелкий шаг: страниц больше, полоса номеров сворачивается многоточием. */
export const МелкийШаг: Story = {
  args: {
    overview: { ...longOverview, itemsTotal: 47, page: 4, pages: 6, size: 8 },
    filters: { ...DEFAULT_STOCK_FILTERS, size: 8 },
  },
};

/**
 * Справочник короче самой мелкой ступени: выбирать нечего, и подвала нет
 * вовсе — ряд ссылок, каждая из которых показывает то же самое, только сбивает.
 */
export const ВыбиратьНечего: Story = {
  args: { overview },
};
