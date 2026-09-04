import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReviewCardView } from './ReviewCardView';
import {
  acceptingApi,
  approvedReview,
  archivedReview,
  failingApi,
  lowRatedReview,
  pendingReview,
  rejectedFromTelegram,
  rejectedReview,
  rejectedWithoutReason,
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

/** Отклонённый: причина, автор решения и дата стоят под самим отзывом. */
export const Отклонён: Story = {
  args: { review: rejectedReview, tab: 'rejected' },
};

/**
 * Отклонённый до появления поля причины (ADR-300).
 *
 * 🔴 Отсутствие названо словами: пустое место под подписью «Причина отказа»
 * читается как «причины не было», а выдумывать её за модератора нельзя.
 */
export const ОтклонёнБезПричины: Story = {
  args: { review: rejectedWithoutReason, tab: 'rejected' },
};

/**
 * Отказ кнопкой в Telegram: причина есть, учётной записи за ней нет — кнопка
 * в чате поля ввода не имеет, и запись честно говорит именно это.
 */
export const ОтклонёнИзЧата: Story = {
  args: { review: rejectedFromTelegram, tab: 'rejected' },
};

/** Низкая оценка: модерация не про «пропускать только хорошие». */
export const НизкаяОценка: Story = {
  args: { review: lowRatedReview },
};

/**
 * В архиве: вернуть на сайт или на модерацию. Кнопки «Удалить» здесь нет
 * намеренно — архив заведён затем, чтобы убрать с сайта, ничего не потеряв
 * (ADR-300).
 */
export const ВАрхиве: Story = {
  args: { review: archivedReview, tab: 'archived' },
};

/** Вкладка «Все»: сквозной поиск по архиву, действий минимум. */
export const ВсеОтзывы: Story = {
  args: { review: approvedReview, tab: 'all' },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
