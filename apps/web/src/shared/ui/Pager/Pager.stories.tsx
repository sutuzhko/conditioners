import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Pager } from './Pager';

const meta = {
  title: 'UI Kit/Pager',
  component: Pager,
  args: { page: 2, pages: 7, basePath: '/admin/clients' },
} satisfies Meta<typeof Pager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const First: Story = {
  name: 'Первая страница',
  args: { page: 1 },
};

export const Last: Story = {
  name: 'Последняя страница',
  args: { page: 7 },
};

/** Список уместился на одну страницу — разбивки быть не должно. */
export const Single: Story = {
  name: 'Одна страница',
  args: { page: 1, pages: 1 },
};

/** Поиск переезжает вместе со страницей, иначе «Дальше» сбрасывает запрос. */
export const WithQuery: Story = {
  name: 'С сохранённым поиском',
  args: { query: { q: 'Соколов' } },
};
