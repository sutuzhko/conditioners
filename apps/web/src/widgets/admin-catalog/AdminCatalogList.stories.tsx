import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminCatalogList } from './AdminCatalogList';
import { catalogRowsFixture } from './fixtures';

const meta = {
  title: 'Админка/Список каталога',
  component: AdminCatalogList,
  args: { products: catalogRowsFixture },
} satisfies Meta<typeof AdminCatalogList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/**
 * 🔴 Все модели со скидкой и все без — две крайности, на которых меряется
 * высота блока цены (issue #354). Если она совпадает здесь и в «Базовом», где
 * скидка есть у одной модели из трёх, главная цифра не пляшет по ряду.
 */
export const БезСкидок: Story = {
  args: {
    products: catalogRowsFixture.map((row) => ({
      ...row,
      oldPrice: null,
      discountPercent: 0,
      saleTo: null,
    })),
  },
};

export const ВсеСоСкидкой: Story = {
  args: {
    products: catalogRowsFixture.map((row) => ({
      ...row,
      oldPrice: Math.round(row.currentPrice * 1.2),
      discountPercent: 17,
      saleTo: '2026-09-30',
    })),
  },
};

/** Каталог пуст — рабочее состояние сразу после установки, а не ошибка. */
export const Пустой: Story = {
  args: { products: [] },
};

/** Пусто из-за отбора: модели есть, их скрыли поиск или видимость. */
export const НичегоНеНашлось: Story = {
  args: { products: [], filtered: true },
};
