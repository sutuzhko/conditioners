import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewFilters } from './ReviewFilters';
import { EMPTY_REVIEW_FILTER } from './model';

const meta = {
  title: 'Админка/Отбор отзывов',
  component: ReviewFilters,
  args: { filter: EMPTY_REVIEW_FILTER },
} satisfies Meta<typeof ReviewFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Отбор выбран: появляется ссылка сброса. */
export const Отобрано: Story = {
  args: { filter: { query: 'штроба', status: 'approved', rating: 4 } },
};
