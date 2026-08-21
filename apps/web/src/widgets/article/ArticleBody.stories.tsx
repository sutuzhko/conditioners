import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';

import { ArticleBody } from './ArticleBody';
import { bodyFixture } from './fixtures';

/**
 * Текст статьи: все виды узлов мини-формата PROJECT §2.7 — заголовки двух
 * уровней, абзац, список, врезка и `**жирный**` внутри любого из них.
 */
const meta = {
  title: 'Страницы/База знаний/Текст статьи',
  component: ArticleBody,
  args: { blocks: parseArticleBody(bodyFixture) },
} satisfies Meta<typeof ArticleBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllBlocks: Story = { name: 'Все виды блоков' };

export const Empty: Story = { name: 'Пустое тело', args: { blocks: [] } };

export const Phone: Story = { name: 'Телефон 375', globals: { viewport: { value: 'sm' } } };
