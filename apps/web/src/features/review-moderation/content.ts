/** Подписи модерации отзывов. */
import type { ConfirmRequest } from '@/shared/ui';
import { formatDateShort } from '@/shared/lib/format';
import type { ReviewStatus, ReviewTab } from './model';

const STATUS_TITLES: Record<ReviewStatus, string> = {
  pending: 'На модерации',
  approved: 'Опубликован',
  rejected: 'Отклонён',
  archived: 'В архиве',
};

/**
 * Подписи вкладок — множественным числом: это фильтр «показать отзывы»,
 * а не подпись состояния одного отзыва.
 */
const TAB_TITLES: Record<ReviewTab, string> = {
  pending: 'На модерации',
  published: 'Опубликованные',
  rejected: 'Отклонённые',
  all: 'Все',
};

export const reviewModerationContent = {
  title: 'Отзывы',
  /* 🔴 Текст объясняет запрет прямо: модератор увидит, что кнопки правки нет
     не по недосмотру. */
  lead: 'Отзывы приходят с сайта через форму. Текст отзыва изменить нельзя — модератор решает только, публиковать его или нет.',

  filterLabel: 'Показать отзывы',

  emptyTitle: 'Отзывов пока нет',
  emptyText:
    'Раздел отзывов на сайте показывает пустое состояние. Выдумывать отзывы нельзя — они появятся, когда их оставят клиенты.',
  emptyAction: 'Открыть раздел на сайте',
  emptyFiltered: 'В этом статусе отзывов нет',
  emptyFilteredText: 'Отзывы в разделе есть — их скрыл выбранный статус.',
  emptyFilteredAction: 'Показать все отзывы',

  approve: 'Опубликовать',
  reject: 'Отклонить',
  archive: 'Снять с сайта',
  restore: 'Вернуть на модерацию',
  remove: 'Удалить',

  /* 🔴 Названо прямо: низкая оценка не повод для отказа. Тройка — это тоже
     отзыв, и модератор обязан видеть напоминание там, где принимает решение
     (issue #356). */
  lowRatingNote: 'Низкая оценка — не причина для отказа: тройка это тоже отзыв.',

  /* 🔴 Причина отказа пока не хранится — у отзыва нет ни поля причины, ни
     модератора (issue #522). Отсутствие названо честно: заглушка с полем,
     которое никуда не уходит, была бы хуже пустого места. */
  reasonTitle: 'Причина отказа',
  reasonMissing: 'Причина не сохранена: поля для неё пока нет',

  photoOpen: 'Открыть фото в полный размер',
  photoClose: 'Закрыть фото',
  photoTitle: (name: string): string => `Фото к отзыву: ${name}`,

  ratingLabel: (value: number): string => `${value} из 5`,

  removeConfirm: {
    title: 'Удалить отзыв безвозвратно?',
    description: 'Отклонение и архив сохраняют его в базе, удаление — нет.',
    confirmLabel: 'Удалить отзыв',
  } satisfies ConfirmRequest,

  rating: (value: number): string => `Оценка ${value} из 5`,
  photoAlt: (name: string): string => `Фотография к отзыву: ${name}`,
  statusTitle: (status: ReviewStatus): string => STATUS_TITLES[status],
  tabTitle: (tab: ReviewTab): string => TAB_TITLES[tab],
  when: (iso: string): string => formatDateShort(iso),

  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
} as const;
