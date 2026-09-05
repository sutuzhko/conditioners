/** Подписи модерации отзывов. */
import type { ConfirmRequest } from '@/shared/ui';
import { REJECT_REASON_MIN } from '@/entities/review/model';
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
  archived: 'В архиве',
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

  /* Отбор вкладки «Все» — не то же самое, что вкладка без записей: там пусто
     из-за статуса, здесь — из-за поиска и условий, которые задал человек. */
  emptySearch: 'Ничего не нашлось',
  emptySearchText: 'Отзывы в разделе есть — их скрыли поиск или выбранные условия.',
  emptySearchAction: 'Сбросить отбор',

  /* Колонки таблиц вкладок (issue #613, макет `ContentTabs`). */
  colAuthor: 'Автор',
  colRating: 'Оценка',
  colText: 'Отзыв',
  colStatus: 'Статус',
  /* 🔴 «Получен», а не «Опубликован», как в макете: даты публикации у отзыва
     нет — в базе лежит только момент, когда его прислали. Подпись обязана
     называть то число, которое под ней стоит. */
  colReceived: 'Получен',
  colReason: 'Причина отказа',
  colRejectedBy: 'Кто и когда',
  colActions: 'Действия',

  /* Подписи отбора вкладки «Все». */
  searchLabel: 'Поиск по отзывам',
  searchHint: 'Имя автора или слова из отзыва',
  searchPlaceholder: 'Автор или текст',
  searchSubmit: 'Найти',
  filterStatus: 'Статус',
  filterStatusAll: 'Любой',
  filterRating: 'Оценка',
  filterRatingAll: 'Любая',
  filterRatingOption: (value: number): string => `${value} из 5`,
  reset: 'Сбросить отбор',

  pagerLabel: 'Страницы списка отзывов',

  approve: 'Опубликовать',
  reject: 'Отклонить',
  archive: 'Снять с сайта',
  restore: 'Вернуть на модерацию',
  remove: 'Удалить',

  /* 🔴 Названо прямо: низкая оценка не повод для отказа. Тройка — это тоже
     отзыв, и модератор обязан видеть напоминание там, где принимает решение
     (issue #356). */
  lowRatingNote: 'Низкая оценка — не причина для отказа: тройка это тоже отзыв.',

  /* 🔴 Причина отказа записывается вместе с решением (ADR-300): отзыв править
     нельзя, и объяснить, за что его убрали, потом будет нечем. */
  reasonTitle: 'Причина отказа',
  reasonHint: 'Останется в панели: автор отзыва её не увидит',
  reasonTooShort: `Объясните отказ — не меньше ${REJECT_REASON_MIN} символов`,
  /* Отзывы, отклонённые до появления поля: выдумывать им причину нельзя. */
  reasonMissing: 'Причина не записана — отзыв отклонили до появления поля',
  /* Кто и когда: причина без автора решения через полгода снова ничья. */
  reasonBy: (who: string | null, iso: string): string =>
    who === null ? formatDateShort(iso) : `${who}, ${formatDateShort(iso)}`,

  rejectTitle: (name: string): string => `Отклонить отзыв: ${name}`,
  rejectDescription: 'Отзыв не попадёт на сайт. Вернуть его на модерацию можно в любой момент.',
  /* Полным действием, как «Удалить отзыв» рядом: в ряду карточки уже есть
     «Отклонить», и две кнопки с одним именем читалка объявляет одинаково. */
  rejectConfirm: 'Отклонить отзыв',
  rejectCancel: 'Отмена',

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
  /** Имя группы действий строки: без него читалка объявляет её безымянной. */
  rowActions: (name: string): string => `Действия над отзывом: ${name}`,
  /** Имя таблицы вкладки для озвучки области прокрутки. */
  tableLabel: (tab: ReviewTab): string => `Отзывы: ${TAB_TITLES[tab].toLowerCase()}`,
  photoAlt: (name: string): string => `Фотография к отзыву: ${name}`,
  statusTitle: (status: ReviewStatus): string => STATUS_TITLES[status],
  tabTitle: (tab: ReviewTab): string => TAB_TITLES[tab],
  when: (iso: string): string => formatDateShort(iso),

  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
} as const;
