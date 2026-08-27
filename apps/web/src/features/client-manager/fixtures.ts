/** Данные для историй и тестов раздела клиентов. */
import type {
  ClientApi,
  ClientCard,
  ClientLead,
  ClientPage,
  ClientUnitApi,
  ClientUnitCard,
} from './model';

export const client: ClientCard = {
  id: 'c1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12, кв. 4',
  note: 'Домофон не работает, звонить на телефон. Пятый этаж без лифта.',
  createdAt: '2026-06-14T09:00:00.000Z',
  leadCount: 2,
};

/** Заведён руками, по звонку: ни адреса, ни заметки, ни обращений с сайта. */
export const bareClient: ClientCard = {
  ...client,
  id: 'c2',
  name: 'Пётр Ильин',
  phone: '+7 (953) 100-20-30',
  address: null,
  note: null,
  leadCount: 0,
};

export const page: ClientPage = {
  items: [client, bareClient],
  total: 2,
  page: 1,
  pages: 1,
};

/** База переросла страницу: разбивка обязана появиться. */
export const longPage: ClientPage = {
  items: [client, bareClient],
  total: 19,
  page: 2,
  pages: 3,
};

export const emptyPage: ClientPage = { items: [], total: 0, page: 1, pages: 1 };

export const leads: readonly ClientLead[] = [
  {
    id: 'l1',
    topic: 'Установка кондиционера',
    status: 'done',
    comment: 'Спальня, окна во двор. Нужен тихий вариант.',
    createdAt: '2026-06-14T09:00:00.000Z',
  },
  {
    id: 'l2',
    topic: 'Обслуживание',
    status: 'new',
    comment: null,
    createdAt: '2026-08-20T07:30:00.000Z',
  },
];

export const acceptingApi: ClientApi = {
  create: async () => ({ ok: true }),
  update: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

/** Телефон уже записан за другим человеком — сервер называет поле. */
const duplicate = {
  ok: false,
  message: 'Этот телефон уже записан за клиентом «Пётр Ильин»',
  field: 'phone',
} as const;

export const failingApi: ClientApi = {
  create: async () => duplicate,
  update: async () => duplicate,
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};

/**
 * «Сегодня» в историях и тестах фиксировано: гарантия, истёкшая на прошлой
 * неделе, обязана выглядеть истёкшей и через год после написания истории.
 */
export const today = '2026-08-27';

/** Монтаж со снимком «после» и действующей гарантией — как приходит из наряда. */
export const unit: ClientUnitCard = {
  id: 'u1',
  model: 'Сплит-система 09',
  installedAt: '2026-07-14T06:30:00.000Z',
  warrantyUntil: '2029-07-14T00:00:00.000Z',
  photo: '/api/media/after-1.jpg',
  order: { id: 'o1', number: 1059 },
};

const curtain: ClientUnitCard = {
  id: 'u2',
  model: 'Тепловая завеса 1500',
  installedAt: '2025-11-03T08:00:00.000Z',
  warrantyUntil: '2028-11-03T00:00:00.000Z',
  photo: null,
  order: { id: 'o2', number: 1041 },
};

export const units: readonly ClientUnitCard[] = [unit, curtain];

/** Одна запись: обычное состояние карточки после первого монтажа. */
export const singleUnit: readonly ClientUnitCard[] = [unit];

/** Гарантия кончилась: следующий выезд — платный ремонт, а не гарантийный. */
export const expiredUnits: readonly ClientUnitCard[] = [
  {
    id: 'u3',
    model: 'Сплит-система 07',
    installedAt: '2022-05-20T07:00:00.000Z',
    warrantyUntil: '2025-05-20T00:00:00.000Z',
    photo: null,
    order: { id: 'o3', number: 812 },
  },
];

/**
 * Техника клиента без нашей продажи: поставлена до этой системы или куплена
 * человеком самостоятельно. Наряда за ней нет, гарантию владелец не записал.
 */
export const ownUnits: readonly ClientUnitCard[] = [
  {
    id: 'u4',
    model: 'Кондиционер клиента, модель не записана',
    installedAt: '2019-06-01T09:00:00.000Z',
    warrantyUntil: null,
    photo: null,
    order: null,
  },
];

export const acceptingUnitApi: ClientUnitApi = {
  create: async () => ({ ok: true }),
  update: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

export const failingUnitApi: ClientUnitApi = {
  create: async () => ({ ok: false, message: 'Укажите дату монтажа', field: 'installedAt' }),
  update: async () => ({ ok: false, message: 'Укажите дату монтажа', field: 'installedAt' }),
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};
