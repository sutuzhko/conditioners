/** Данные для историй и тестов раздела клиентов. */
import type { ClientApi, ClientCard, ClientLead, ClientPage } from './model';

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
