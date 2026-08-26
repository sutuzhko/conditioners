/** Подписи раздела заявок. */
import { formatDateTime } from '@/shared/lib/format';
import { leadStatusTitle } from '@/entities/lead/model';

import type { LeadStatus } from './model';

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
  /** Обращение становится карточкой человека в базе клиентов (ADR-105). */
  toClient: 'В клиенты',
  toClientBusy: 'Заводим…',
  toClientCreated: 'Клиент заведён',
  toClientLinked: 'Этот номер уже в базе — обращение привязано к карточке',
  inBase: 'Открыть карточку клиента',
  saveNote: 'Сохранить заметку',
  saving: 'Сохраняем…',
  saved: 'Сохранено',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',

  /** Название статуса — доменное, одно на проект (`entities/lead`). */
  statusTitle: (status: LeadStatus): string => leadStatusTitle(status),
  /** Дата и время по Москве: заявку обрабатывают из Тулы, а не из браузера клиента. */
  when: (iso: string): string => formatDateTime(iso),
  consentAt: (iso: string): string => `дано ${leadManagerContent.when(iso)}`,
} as const;
