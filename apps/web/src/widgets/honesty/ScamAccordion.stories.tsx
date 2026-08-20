import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ScamAccordion } from './ScamAccordion';
import { scamArticleHref } from './fixtures';
import { scamSchemes } from './content';

/**
 * Пять схем обмана. 🔴 Разбор остаётся в HTML в любом состоянии аккордеона —
 * в свёрнутой истории он тоже есть в DOM, просто визуально скрыт.
 */
const meta = {
  title: 'Блоки/Честность — как обманывают',
  component: ScamAccordion,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ScamAccordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Первая схема раскрыта',
  args: { articleHref: scamArticleHref },
};

export const Collapsed: Story = {
  name: 'Все схемы свёрнуты',
  args: { articleHref: scamArticleHref, defaultOpen: [] },
};

export const LastOpen: Story = {
  name: 'Раскрыта последняя схема',
  args: {
    articleHref: scamArticleHref,
    defaultOpen: scamSchemes.slice(-1).map((scheme) => scheme.id),
  },
};

export const WithoutArticle: Story = {
  name: 'Без ссылки на разбор в Базе знаний',
  args: {},
};
