import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleView } from './ArticleView';
import {
  articleFixture,
  articleWithCoverFixture,
  ctaLinksFixture,
  leadHrefFixture,
  listHrefFixture,
  shortArticleFixture,
} from './fixtures';

/**
 * Страница статьи: заголовок, метаданные, оглавление, текст и переход
 * к коммерческим разделам.
 */
const meta = {
  title: 'Страницы/База знаний/Статья',
  component: ArticleView,
  args: {
    article: articleFixture,
    listHref: listHrefFixture,
    leadHref: leadHrefFixture,
    links: ctaLinksFixture,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArticleView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: 'Статья без обложки' };

export const WithCover: Story = {
  name: 'Статья с обложкой',
  args: { article: articleWithCoverFixture },
};

export const Short: Story = {
  name: 'Короткая заметка — без оглавления',
  args: { article: shortArticleFixture },
};

export const Tablet: Story = { name: 'Планшет 768', globals: { viewport: { value: 'md' } } };

export const Phone: Story = { name: 'Телефон 375', globals: { viewport: { value: 'sm' } } };

export const Narrow: Story = { name: 'Минимум 320', globals: { viewport: { value: 'xs' } } };
