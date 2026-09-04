import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleTabs } from './ArticleTabs';

const meta = {
  title: 'Админка/Вкладки статьи',
  component: ArticleTabs,
  args: { id: 'demo', active: 'text' },
} satisfies Meta<typeof ArticleTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Текст: Story = {};

export const SEO: Story = { args: { active: 'seo' } };

export const Публикация: Story = { args: { active: 'publish' } };

/**
 * Заготовка раздела: открытой вкладки нет — `loading.tsx` параметров адреса
 * не получает и подсветить может только не ту.
 */
export const БезВыбранной: Story = { args: { active: undefined } };
