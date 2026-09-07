import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { stockManagerContent as texts } from './content';
import { StockPager } from './StockPager';
import { longOverview, overview } from './fixtures';
import { DEFAULT_STOCK_PAGE_SIZE, STOCK_PATH } from './model';

const meta = {
  title: 'Админка/Склад · Разбивка',
  component: StockPager,
  args: {
    page: longOverview.page,
    pages: longOverview.pages,
    count: texts.shown(longOverview.items.length, longOverview.total),
    scope: 47,
    size: DEFAULT_STOCK_PAGE_SIZE,
    basePath: STOCK_PATH,
    query: {},
  },
} satisfies Meta<typeof StockPager>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Справочник длиннее страницы: счёт, номера страниц и выбор шага. */
export const Базовое: Story = {};

/** Первая страница: шаг «назад» остаётся на месте, чтобы номера не прыгали. */
export const ПерваяСтраница: Story = {
  args: { page: 1 },
};

/** Выбран мелкий шаг: страниц больше, полоса номеров сворачивается многоточием. */
export const МелкийШаг: Story = {
  args: { page: 4, pages: 6, size: 8, query: { size: '8' } },
};

/**
 * Справочник короче самой мелкой ступени: выбирать нечего, и подвала нет
 * вовсе — ряд ссылок, каждая из которых показывает то же самое, только сбивает.
 */
export const ВыбиратьНечего: Story = {
  args: {
    page: overview.page,
    pages: overview.pages,
    count: texts.shown(overview.items.length, overview.total),
    scope: overview.itemsTotal,
    size: DEFAULT_STOCK_PAGE_SIZE,
  },
};

/**
 * Подвал журнала движений (issue #725): тот же ряд, но считаются движения, а
 * шаг переезжает вместе с отбором и вкладкой раздела.
 */
export const Журнал: Story = {
  args: {
    count: texts.shownMoves(20, 137),
    scope: 137,
    query: { tab: 'log', period: 'month' },
  },
};
