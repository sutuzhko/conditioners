/** Данные для историй и тестов раздела заявок. */
import type { LeadCard, LeadToClient, LeadUpdate } from './model';

export const newLead: LeadCard = {
  id: 'l1',
  name: 'Ирина',
  phone: '+79001234567',
  topic: 'Установка кондиционера',
  place: 'Квартира',
  qty: '1',
  callTime: 'После 18:00',
  address: null,
  comment: 'Второй этаж, окна во двор. Нужен тихий вариант для спальни.',
  photo: null,
  sourceUrl: 'https://example.test/prices',
  status: 'new',
  managerComment: null,
  clientId: null,
  createdAt: '2026-08-20T09:15:00.000Z',
  consentAt: '2026-08-20T09:15:00.000Z',
};

/** Минимальная заявка: только обязательные поля. */
export const bareLead: LeadCard = {
  ...newLead,
  id: 'l2',
  topic: 'Консультация',
  place: null,
  qty: null,
  callTime: null,
  comment: null,
  sourceUrl: null,
};

export const workedLead: LeadCard = {
  ...newLead,
  id: 'l3',
  status: 'in_progress',
  managerComment: 'Перезвонил, ждёт замер в четверг',
};

/** Обращение уже заведено в базу клиентов: кнопка сменилась ссылкой на карточку. */
export const clientLead: LeadCard = {
  ...newLead,
  id: 'l4',
  clientId: 'c1',
};

export const acceptingUpdate: LeadUpdate = async () => ({ ok: true });

export const failingUpdate: LeadUpdate = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});

export const acceptingToClient: LeadToClient = async () => ({
  ok: true,
  clientId: 'c1',
  created: true,
});

/** Номер уже был в базе: карточка не заводится, обращение к ней привязывается. */
export const linkingToClient: LeadToClient = async () => ({
  ok: true,
  clientId: 'c9',
  created: false,
});

export const failingToClient: LeadToClient = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});
