/** Данные для историй и тестов раздела команды. */
import type { InstallerNoteCard, StaffApi, StaffDetails } from './model';

export const activeInstaller: StaffDetails = {
  id: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  phone: '+7 (910) 155-24-68',
  role: 'installer',
  employment: 'self_employed',
  /* Настоящий по контрольным разрядам: битый номер схема не пропустит, и
     история с ним показывала бы состояние, до которого нельзя дойти. */
  inn: '710703123450',
  active: true,
  createdAt: '2026-04-10T09:00:00.000Z',
  lastLoginAt: '2026-08-24T06:12:00.000Z',
};

/**
 * Самозанятый, у которого ИНН ещё не заведён.
 *
 * 🔴 Отдельная фикстура: пока номера нет, статус на дату выплаты проверить
 * нечем, и карточка обязана предупредить об этом владельца.
 */
export const selfEmployedNoInn: StaffDetails = {
  ...activeInstaller,
  id: 'u8',
  login: 'gusev',
  name: 'Никита Гусев',
  inn: null,
};

/** Подрядчик по ГПХ: удержание уменьшает вознаграждение, как и у самозанятого. */
export const contractInstaller: StaffDetails = {
  ...activeInstaller,
  id: 'u5',
  login: 'ivanov',
  name: 'Сергей Иванов',
  employment: 'contract',
};

/** Работник по трудовому договору: удержание остаётся внутренней пометкой. */
export const staffInstaller: StaffDetails = {
  ...activeInstaller,
  id: 'u6',
  login: 'orlov',
  name: 'Павел Орлов',
  employment: 'staff',
  /* Штатному ИНН в системе не нужен: его статус никто не проверяет. */
  inn: null,
};

/**
 * Оформление не заведено. Отдельная фикстура, а не «ещё один монтажник»:
 * пока значения нет, наряд не уменьшает вознаграждение, и увидеть это
 * состояние в истории обязательно.
 */
export const unsetEmploymentInstaller: StaffDetails = {
  ...activeInstaller,
  id: 'u7',
  login: 'kotov',
  name: 'Роман Котов',
  employment: null,
  inn: null,
};

export const disabledInstaller: StaffDetails = {
  ...activeInstaller,
  id: 'u3',
  login: 'belov',
  name: 'Артём Белов',
  employment: 'contract',
  active: false,
  lastLoginAt: null,
};

/** Имя ещё не заполнено — интерфейс обязан показать логин, а не пустоту. */
export const namelessInstaller: StaffDetails = {
  ...activeInstaller,
  id: 'u4',
  login: 'petrov',
  name: null,
  phone: null,
  employment: null,
  inn: null,
};

export const ownerAccount: StaffDetails = {
  id: 'u1',
  login: 'admin',
  name: null,
  phone: null,
  role: 'owner',
  /* У владельца оформления нет: наряды ему не назначают, и уменьшать
     вознаграждение самому себе не из чего. */
  employment: null,
  inn: null,
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

/**
 * Адресный отказ сервера: `field` называет поле, и форма обязана подсветить
 * именно его, а не показать красную плашку внизу.
 */
const refusedField = { ...refused, field: 'login' } as const;

export const fieldRefusingApi: StaffApi = {
  create: async () => refusedField,
  update: async () => refusedField,
  remove: async () => refused,
  addNote: async () => refused,
  removeNote: async () => refused,
};
