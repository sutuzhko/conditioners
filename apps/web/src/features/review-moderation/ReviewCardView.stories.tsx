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
  reviewWithMissingPhoto,
  reviewWithPhoto,
} from './fixtures';

const meta = {
  title: 'Админка/Отзыв в модерации',
  component: ReviewCardView,
  /* 🔴 Истории идут внутри контейнера панели (issue #867). Без `data-ui="panel"`
     не объявлены ни высоты кнопок, ни радиус карточки (ADR-187): решение
     мерилось бы кнопкой 40px там, где на странице стоит 32, а ниже 900px — той
     же 40 вместо тап-зоны 44. Композицию карточки принимают глазами, и глядеть
     на неё надо в той геометрии, в которой она живёт. */
  decorators: [
    (Story) => (
      <div data-ui="panel">
        <Story />
      </div>
    ),
  ],
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

/** Со снимком места установки: превью открывается в полный размер. */
export const СоСнимком: Story = {
  args: { review: reviewWithPhoto },
};

/**
 * 🔴 Файла снимка нет — issue #662.
 *
 * На месте превью рамка того же размера и объяснение словом: ни битой
 * картинки, ни ссылки «открыть в полный размер», ведущей в 404. Высота
 * карточки при этом та же, что и со снимком, — пропавший файл не двигает
 * кнопки решения под курсором.
 */
export const СнимокНедоступен: Story = {
  args: { review: reviewWithMissingPhoto },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
