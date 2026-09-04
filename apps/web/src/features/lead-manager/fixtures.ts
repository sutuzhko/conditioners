/** Данные для историй и тестов раздела заявок. */
import type { LeadContext } from '@/entities/lead/model';

import type { LeadCard, LeadQueueItem, LeadToClient, LeadToOrder, LeadUpdate } from './model';

/**
 * Контекст заявки: человек посчитал смету, подобрал модель по площади и
 * отметил две. Цифры демонстрационные — настоящие приходят из прайса и
 * каталога (инвариант 8).
 */
export const leadContextFixture: LeadContext = {
  estimate: {
    params: [
      { label: 'Класс мощности', value: '09 · до 27 м²' },
      { label: 'Длина трассы', value: '7 м' },
      { label: 'Этаж', value: '1–9' },
      { label: 'Штробление', value: 'да' },
      { label: 'Количество блоков', value: '2' },
    ],
    lines: [
      { label: 'Базовый монтаж, класс 09', amount: 6000 },
      { label: 'Трасса сверх включённой, 4 м × 700 ₽/м', amount: 2800 },
      { label: 'Штробление, 7 м × 900 ₽/м', amount: 6300 },
    ],
    perUnit: 15100,
    qty: 2,
    total: 30200,
  },
  pick: {
    area: 25,
    place: 'Квартира',
    model: { slug: 'split-09', name: 'Сплит-система 09', price: 34900, oldPrice: 39900 },
  },
  model: null,
  liked: [
    { slug: 'split-07', name: 'Сплит-система 07', price: 28900, oldPrice: null },
    { slug: 'split-12', name: 'Сплит-система 12', price: 41900, oldPrice: null },
  ],
};

export const newLead: LeadCard = {
  id: 'l1',
  name: 'Ирина',
  phone: '+79001234567',
  topic: 'Установка кондиционера',
  model: null,
  place: 'Квартира',
  qty: '1',
  callTime: 'После 18:00',
  address: null,
  comment: 'Второй этаж, окна во двор. Нужен тихий вариант для спальни.',
  photo: null,
  sourceUrl: 'https://example.test/prices',
  context: null,
  status: 'new',
  managerComment: null,
  clientId: null,
  createdAt: '2026-08-20T09:15:00.000Z',
  consentAt: '2026-08-20T09:15:00.000Z',
};

/** Заявка со следом: смета, подбор и отметки уехали вместе с телефоном. */
export const contextLead: LeadCard = {
  ...newLead,
  id: 'l5',
  context: leadContextFixture,
};

/**
 * Заявка от кнопки у модели: человек видел название в поле формы и подтвердил
 * его (ADR-129). Контекст рядом называет ту же модель — так и бывает, и
 * подписи в карточке обязаны различать подтверждённое поле и снимок.
 */
export const modelLead: LeadCard = {
  ...newLead,
  id: 'l6',
  model: 'Сплит-система 09',
  context: {
    estimate: null,
    pick: null,
    model: { slug: 'split-09', name: 'Сплит-система 09', price: 34900, oldPrice: 39900 },
    liked: [],
  },
};

/** Минимальная заявка: только обязательные поля. */
export const bareLead: LeadCard = {
  ...newLead,
  id: 'l2',
  topic: 'Консультация',
  model: null,
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

export const acceptingToOrder: LeadToOrder = async () => ({
  ok: true,
  clientId: 'c1',
  status: 'in_progress',
});

export const failingToOrder: LeadToOrder = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});

/** Очередь обращений: разные статусы и длины имён — то, что бывает на экране. */
export const leadQueueFixture: readonly LeadQueueItem[] = [
  {
    id: newLead.id,
    name: newLead.name,
    phone: newLead.phone,
    topic: newLead.topic,
    status: newLead.status,
    createdAt: newLead.createdAt,
  },
  {
    id: workedLead.id,
    name: 'Федотова Лидия Ивановна',
    phone: workedLead.phone,
    topic: 'Установка кондиционера',
    status: 'in_progress',
    createdAt: '2026-08-30T09:19:00.000Z',
  },
  {
    id: bareLead.id,
    name: 'Игорь',
    phone: bareLead.phone,
    topic: 'Консультация',
    status: 'rejected',
    createdAt: '2026-08-23T13:19:00.000Z',
  },
  {
    id: clientLead.id,
    name: 'Беляева Ольга',
    phone: clientLead.phone,
    topic: 'Ремонт',
    status: 'done',
    createdAt: '2026-08-15T13:19:00.000Z',
  },
];
