import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminArticleList } from './AdminArticleList';
import { articleRowsFixture } from './fixtures';

const meta = {
  title: 'Админка/Список статей',
  component: AdminArticleList,
  args: { articles: articleRowsFixture },
} satisfies Meta<typeof AdminArticleList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

export const Пусто: Story = {
  args: { articles: [] },
};
