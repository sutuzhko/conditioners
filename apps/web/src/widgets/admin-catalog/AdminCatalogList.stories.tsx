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

/** Каталог пуст — рабочее состояние сразу после установки, а не ошибка. */
export const Пустой: Story = {
  args: { products: [] },
};
