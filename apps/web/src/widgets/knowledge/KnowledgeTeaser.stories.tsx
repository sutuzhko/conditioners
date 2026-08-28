import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { KnowledgeTeaser } from './KnowledgeTeaser';
import {
  allHrefFixture,
  articleHrefFixture,
  articleLongFixture,
  articleWithCoverFixture,
  articlesFixture,
} from './fixtures';

/**
 * Тизер Базы знаний.
 *
 * Первой идёт пустая секция: раздел наполняется постепенно, статьи мы пишем
 * сами, и «статей пока нет» — рабочее состояние блока, а не крайний случай.
 */
const meta = {
  title: 'Блоки/База знаний',
  component: KnowledgeTeaser,
  args: { articleHref: articleHrefFixture, allHref: allHrefFixture },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof KnowledgeTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: 'Статей ещё нет' };

export const WithArticles: Story = { name: 'Три статьи', args: { articles: articlesFixture } };

/**
 * Обложка есть только у первой статьи: у двух соседок её место занимает
 * типографская плашка с рубрикой (ADR-127). Смысл истории — что карточки в
 * ряду одной высоты и одного строения независимо от файла.
 */
export const WithCover: Story = {
  name: 'Обложка есть и обложки нет',
  args: { articles: [articleWithCoverFixture, ...articlesFixture.slice(0, 2)] },
};

export const LongTitles: Story = {
  name: 'Длинные заголовки',
  args: { articles: [articleLongFixture, ...articlesFixture] },
};

export const Tablet: Story = {
  name: 'Планшет 768',
  args: { articles: articlesFixture },
  globals: { viewport: { value: 'md' } },
};

export const Phone: Story = {
  name: 'Телефон 375',
  args: { articles: articlesFixture },
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320',
  args: { articles: [articleLongFixture, ...articlesFixture] },
  globals: { viewport: { value: 'xs' } },
};
