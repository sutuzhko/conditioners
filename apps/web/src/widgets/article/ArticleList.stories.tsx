import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleList } from './ArticleList';
import {
  articleHrefFixture,
  categoryHrefFixture,
  pagedFixture,
  singleCategoryFixture,
  teasersFixture,
} from './fixtures';

/**
 * Листинг Базы знаний.
 *
 * Первой идёт пустая витрина: статьи мы пишем сами, и «статей пока нет» —
 * рабочее состояние раздела, а не крайний случай.
 */
const meta = {
  title: 'Страницы/База знаний/Листинг',
  component: ArticleList,
  args: {
    categoryHref: categoryHrefFixture,
    articleHref: articleHrefFixture,
    basePath: '/knowledge',
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArticleList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: 'Статей ещё нет' };

/**
 * Обложка есть у одной статьи из трёх: у остальных её место занимает
 * типографская плашка с рубрикой (ADR-127) — карточки в сетке остаются
 * одной высоты.
 */
export const WithArticles: Story = {
  name: 'Три статьи: с обложкой и без',
  args: { articles: teasersFixture },
};

export const Filtered: Story = {
  name: 'Выбрана рубрика',
  args: { articles: teasersFixture, activeCategory: 'uhod' },
};

export const SingleCategory: Story = {
  name: 'Одна рубрика — фильтра нет',
  args: { articles: singleCategoryFixture },
};

export const UnknownCategory: Story = {
  name: 'Рубрики из ссылки больше нет',
  args: { articles: teasersFixture, activeCategory: 'takoy-rubriki-net' },
};

export const Tablet: Story = {
  name: 'Планшет 768',
  args: { articles: teasersFixture },
  globals: { viewport: { value: 'md' } },
};

export const Phone: Story = {
  name: 'Телефон 375',
  args: { articles: teasersFixture },
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320',
  args: { articles: teasersFixture },
  globals: { viewport: { value: 'xs' } },
};

/**
 * Разбивка на страницы: девять карточек на странице, ссылки соседних страниц
 * и подпись положения. Состояние появляется только на длинном разделе,
 * поэтому фикстура размножена.
 */
export const Paged: Story = {
  name: 'Разбивка на страницы',
  args: { articles: pagedFixture, activePage: 2 },
};
