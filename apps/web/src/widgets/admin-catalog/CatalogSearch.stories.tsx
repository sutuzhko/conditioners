import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CatalogSearch } from './CatalogSearch';

const meta = {
  title: 'Админка/Отбор каталога',
  component: CatalogSearch,
  args: { filter: { query: '', visibility: undefined } },
} satisfies Meta<typeof CatalogSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Отбор выбран: появляется ссылка сброса. */
export const Отобрано: Story = {
  args: { filter: { query: 'инвертор', visibility: 'hidden' } },
};
