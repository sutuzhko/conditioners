import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Breadcrumbs } from './Breadcrumbs';
import { articleTrail, nestedTrail, singleTrail, siteUrlFixture } from './fixtures';

/**
 * Хлебные крошки. Стоят на всех страницах кроме главной (docs/SEO.md §5):
 * видимый след плюс разметка `BreadcrumbList` из того же списка.
 */
const meta = {
  title: 'Блоки/Хлебные крошки',
  component: Breadcrumbs,
  args: { siteUrl: siteUrlFixture },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = { name: 'Один уровень', args: { items: singleTrail } };

export const Nested: Story = { name: 'Два уровня', args: { items: nestedTrail } };

export const LongTitle: Story = { name: 'Длинный заголовок', args: { items: articleTrail } };

export const Home: Story = {
  name: 'Главная — следа нет',
  args: { items: [] },
};
