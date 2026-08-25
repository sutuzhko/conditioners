/** Данные для историй и тестов раздела команды. */
import type { InstallerNoteCard, StaffApi, StaffCard } from './model';

export const activeInstaller: StaffCard = {
  id: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  phone: '+7 (910) 155-24-68',
  role: 'installer',
  active: true,
  createdAt: '2026-04-10T09:00:00.000Z',
  lastLoginAt: '2026-08-24T06:12:00.000Z',
};

export const disabledInstaller: StaffCard = {
  ...activeInstaller,
  id: 'u3',
  login: 'belov',
  name: 'Артём Белов',
  active: false,
  lastLoginAt: null,
};

/** Имя ещё не заполнено — интерфейс обязан показать логин, а не пустоту. */
export const namelessInstaller: StaffCard = {
  ...activeInstaller,
  id: 'u4',
  login: 'petrov',
  name: null,
  phone: null,
};

export const ownerAccount: StaffCard = {
  id: 'u1',
  login: 'admin',
  name: null,
  phone: null,
  role: 'owner',
  active: true,
  createdAt: '2026-01-15T09:00:00.000Z',
  lastLoginAt: '2026-08-25T05:00:00.000Z',
};

export const notes: readonly InstallerNoteCard[] = [
  {
    id: 'n1',
    text: 'Аккуратный монтаж, клиенты хвалят. Можно доверять сложные объекты.',
    createdAt: '2026-07-15T10:00:00.000Z',
  },
];

export const acceptingApi: StaffApi = {
  create: async () => ({ ok: true }),
  update: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
  addNote: async () => ({ ok: true }),
  removeNote: async () => ({ ok: true }),
};

const refused = { ok: false, message: 'Такой логин уже занят' } as const;

export const failingApi: StaffApi = {
  create: async () => refused,
  update: async () => refused,
  remove: async () => refused,
  addNote: async () => refused,
  removeNote: async () => refused,
};
