import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleSearch } from './ArticleSearch';
import { articleCategoriesFixture, emptyArticleFilterFixture } from './fixtures';

const meta = {
  title: 'Админка/Отбор статей',
  component: ArticleSearch,
  args: { filter: emptyArticleFilterFixture, categories: articleCategoriesFixture },
} satisfies Meta<typeof ArticleSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Отбор выбран: появляется ссылка сброса. */
export const Отобрано: Story = {
  args: {
    filter: { query: 'штроба', category: 'Монтаж', state: 'draft', order: 'old' },
  },
};

/** Рубрик ещё нет: список рубрик остаётся на месте с единственным пунктом —
    иначе строка отбора меняла бы высоту в момент прихода данных. */
export const БезРубрик: Story = {
  args: { categories: [] },
};
