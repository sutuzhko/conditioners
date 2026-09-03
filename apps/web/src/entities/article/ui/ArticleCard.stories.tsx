import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleCard } from './ArticleCard';
import {
  articleBareFixture,
  articleFixture,
  articleHrefFixture,
  articleLongFixture,
  articleWithCoverFixture,
} from './fixtures';

/**
 * Карточка статьи — одна на тизер главной и на листинг `/knowledge`.
 *
 * 🔴 Строение меняется на порогах: до 600 обложки нет вовсе, от 600 она
 * возвращается узкой полосой слева (и только если карточке хватает ширины —
 * полоса живёт на запросе контейнера), от 1200 встаёт сверху. Поэтому у
 * историй есть варианты по ширинам: на одной ширине карточку не проверить.
 */
const meta = {
  title: 'Блоки/База знаний/Карточка статьи',
  component: ArticleCard,
  args: { article: articleFixture, href: articleHrefFixture },
  parameters: { layout: 'padded' },
  decorators: [
    // карточка — элемент списка: без списка разметка невалидна, а `li` без
    // родителя теряет собственные отступы
    (Story) => (
      <ul style={{ display: 'grid', gap: 16, margin: 0, padding: 0, listStyle: 'none' }}>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof ArticleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Base: Story = { name: 'Без обложки' };

export const WithCover: Story = {
  name: 'С обложкой',
  args: { article: articleWithCoverFixture },
};

export const LongText: Story = {
  name: 'Длинные заголовок и анонс',
  args: { article: articleLongFixture },
};

/** Рубрика и анонс не заполнены: карточка остаётся карточкой. */
export const Bare: Story = {
  name: 'Без рубрики и анонса',
  args: { article: articleBareFixture },
};

/** Заголовок листинга — `h2`: единственный `h1` там занят названием раздела. */
export const AsListing: Story = {
  name: 'Заголовок второго уровня',
  args: { article: articleWithCoverFixture, headingLevel: 2 },
};

export const Phone: Story = {
  name: 'Телефон 375',
  args: { article: articleWithCoverFixture },
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320',
  args: { article: articleLongFixture },
  globals: { viewport: { value: 'xs' } },
};

export const Tablet: Story = {
  name: 'Планшет 768',
  args: { article: articleWithCoverFixture },
  globals: { viewport: { value: 'md' } },
};
