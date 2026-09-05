import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewTable } from './ReviewTable';
import {
  approvedReview,
  archivedReview,
  rejectedFromTelegram,
  rejectedReview,
  rejectedWithoutReason,
  tableReviewsFixture,
} from './fixtures';

const meta = {
  title: 'Админка/Отзывы таблицей',
  component: ReviewTable,
  args: { reviews: [approvedReview], tab: 'published' },
} satisfies Meta<typeof ReviewTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Опубликованные: снять с сайта можно, отредактировать — нет (инвариант 7). */
export const Опубликованные: Story = {
  args: { reviews: [approvedReview, archivedReview], tab: 'published' },
};

/** Отклонённые: причина отказа и её автор видны прямо в строке (ADR-300). */
export const Отклонённые: Story = {
  args: {
    reviews: [rejectedReview, rejectedFromTelegram, rejectedWithoutReason],
    tab: 'rejected',
  },
};

export const ВАрхиве: Story = {
  args: { reviews: [archivedReview], tab: 'archived' },
};

/** «Все»: у каждой строки свой статус — и свой набор действий. */
export const Все: Story = {
  args: { reviews: tableReviewsFixture, tab: 'all' },
};

/** Вкладка пуста, а отзывы в разделе есть: виноват выбранный статус. */
export const ПустаяВкладка: Story = {
  args: { reviews: [], tab: 'published', filtered: true },
};

/** Пусто из-за отбора «Все»: сбрасывать надо поиск и условия. */
export const НичегоНеНашлось: Story = {
  args: { reviews: [], tab: 'all', searched: true },
};

/** Раздел стартует без единого отзыва — выдумывать их нельзя (инвариант 10). */
export const Пусто: Story = {
  args: { reviews: [], tab: 'all' },
};
