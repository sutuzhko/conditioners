import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewCardView } from './ReviewCardView';
import {
  acceptingApi,
  approvedReview,
  failingApi,
  lowRatedReview,
  pendingReview,
  rejectedReview,
} from './fixtures';

const meta = {
  title: 'Админка/Отзыв в модерации',
  component: ReviewCardView,
  args: { review: pendingReview, api: acceptingApi, tab: 'pending' },
} satisfies Meta<typeof ReviewCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Очередь модерации: текст целиком и решение из двух кнопок. */
export const НаМодерации: Story = {};

/** Опубликованный: снять с сайта можно, отредактировать — нет (инвариант 7). */
export const Опубликован: Story = {
  args: { review: approvedReview, tab: 'published' },
};

/**
 * Отклонённый: место под причину отказа готово, а её отсутствие названо
 * честно — поля для неё пока нет (issue #522).
 */
export const Отклонён: Story = {
  args: { review: rejectedReview, tab: 'rejected' },
};

/** Низкая оценка: модерация не про «пропускать только хорошие». */
export const НизкаяОценка: Story = {
  args: { review: lowRatedReview },
};

/** Вкладка «Все»: сквозной поиск по архиву, действий минимум. */
export const ВсеОтзывы: Story = {
  args: { review: approvedReview, tab: 'all' },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
