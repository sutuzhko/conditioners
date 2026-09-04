import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SerpPreview } from './SerpPreview';
import { buildSerpSnippet } from './serp';
import { filledArticle } from './fixtures';

/* Демонстрационный адрес: настоящий приходит с сервера (инвариант 8). */
const DEMO = { siteUrl: 'https://example.test', titleSuffix: 'Демо-стенд' };

const meta = {
  title: 'Админка/Превью выдачи',
  component: SerpPreview,
  args: { snippet: buildSerpSnippet({ ...filledArticle, ...DEMO }) },
} satisfies Meta<typeof SerpPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Своего заголовка нет — к названию статьи дописана приписка бренда. */
export const ИзЗаголовкаСтатьи: Story = {};

/** Свой заголовок выдачи: он написан под неё и приписку не получает. */
export const СвойЗаголовок: Story = {
  args: {
    snippet: buildSerpSnippet({
      ...filledArticle,
      ...DEMO,
      seoTitle: 'Инвертор или обычный кондиционер: что выгоднее в Туле',
      seoDescription: 'Считаем разницу в цене, шуме и счетах за электричество.',
    }),
  },
};

/** Ничего не заполнено: пустые места названы словами, а не пустой рамкой. */
export const Пустое: Story = {
  args: {
    snippet: buildSerpSnippet({
      ...filledArticle,
      ...DEMO,
      title: '',
      excerpt: '',
      slug: '',
    }),
  },
};
