import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewCardView } from './ReviewCardView';
import {
  acceptingApi,
  approvedReview,
  failingApi,
  lowRatedReview,
  pendingReview,
} from './fixtures';

const meta = {
  title: 'Админка/Отзыв в модерации',
  component: ReviewCardView,
  args: { review: pendingReview, api: acceptingApi },
} satisfies Meta<typeof ReviewCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const НаМодерации: Story = {};

export const Опубликован: Story = {
  args: { review: approvedReview },
};

/** Низкая оценка: модерация не про «пропускать только хорошие». */
export const НизкаяОценка: Story = {
  args: { review: lowRatedReview },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
