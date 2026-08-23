/** Подписи модерации отзывов. */
import type { ReviewStatus } from './model';

const STATUS_TITLES: Record<ReviewStatus, string> = {
  pending: 'На модерации',
  approved: 'Опубликован',
  rejected: 'Отклонён',
  archived: 'В архиве',
};

export const reviewModerationContent = {
  title: 'Отзывы',
  /* 🔴 Текст объясняет запрет прямо: модератор увидит, что кнопки правки нет
     не по недосмотру. */
  lead: 'Отзывы приходят с сайта через форму. Текст отзыва изменить нельзя — модератор решает только, публиковать его или нет.',

  filterLabel: 'Показать отзывы',
  filterAll: 'Все',

  emptyTitle: 'Отзывов пока нет',
  emptyText:
    'Раздел отзывов на сайте показывает пустое состояние. Выдумывать отзывы нельзя — они появятся, когда их оставят клиенты.',
  emptyFiltered: 'В этом статусе отзывов нет',

  approve: 'Опубликовать',
  reject: 'Отклонить',
  archive: 'В архив',
  restore: 'Вернуть на модерацию',
  remove: 'Удалить',

  removeConfirm:
    'Удалить отзыв безвозвратно? Отклонение и архив сохраняют его в базе, удаление — нет.',

  rating: (value: number): string => `Оценка ${value} из 5`,
  statusTitle: (status: ReviewStatus): string => STATUS_TITLES[status],
  when: (iso: string): string =>
    new Date(iso).toLocaleDateString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),

  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
} as const;
