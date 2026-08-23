/** Подписи раздела заявок. */
import type { LeadStatus } from './model';

const STATUS_TITLES: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Завершена',
  rejected: 'Отказ',
};

export const leadManagerContent = {
  title: 'Заявки',
  lead: 'Обращения с сайта. Заявка записывается в базу до отправки уведомлений — она не теряется, даже если Telegram или почта недоступны.',

  filterAll: 'Все',
  filterLabel: 'Показать заявки',

  emptyTitle: 'Заявок пока нет',
  emptyText:
    'Здесь появятся обращения с сайта: из формы заявки, из калькулятора и с карточек моделей.',
  emptyFiltered: 'В этом статусе заявок нет',

  phone: 'Телефон',
  topic: 'Тема',
  place: 'Помещение',
  qty: 'Количество',
  callTime: 'Когда звонить',
  address: 'Адрес',
  comment: 'Комментарий клиента',
  photo: 'Фотография',
  source: 'Страница-источник',
  consent: 'Согласие на обработку данных',

  managerComment: 'Заметка менеджера',
  managerCommentHint: 'Видна только в админке. Клиенту не показывается',

  status: 'Статус',
  /** Переход в календарь: запланировать звонок или замер по этой заявке. */
  plan: 'В календарь',
  saveNote: 'Сохранить заметку',
  saving: 'Сохраняем…',
  saved: 'Сохранено',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',

  statusTitle: (status: LeadStatus): string => STATUS_TITLES[status],
  /** Дата и время по Москве: заявку обрабатывают из Тулы, а не из браузера клиента. */
  when: (iso: string): string =>
    new Date(iso).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  consentAt: (iso: string): string => `дано ${leadManagerContent.when(iso)}`,
} as const;
