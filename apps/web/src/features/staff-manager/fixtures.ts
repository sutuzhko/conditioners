/** Данные для историй и тестов раздела команды. */
import { DANGEROUS_PERMISSIONS, PANEL_SECTION_PERMISSIONS } from './model';
import type {
  InstallerNoteCard,
  StaffApi,
  StaffDetails,
  StaffOrder,
  StaffRowStats,
  StaffTotals,
} from './model';

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
  /* У монтажника разрешений нет и быть не может: доступ ему задан ролью
     целиком, переключатели есть только у администратора (ADR-344). */
  permissions: [],
  active: true,
  createdAt: '2026-04-10T09:00:00.000Z',
  lastLoginAt: '2026-08-24T06:12:00.000Z',
};

/**
 * Администратор с частью открытых разделов — то, ради чего заведён экран прав.
 *
 * Набор нарочно неровный: два раздела клиентского цикла и одно опасное
 * действие. Полный и пустой наборы — свои фикстуры: по ним видно оба края.
 */
export const administrator: StaffDetails = {
  id: 'u9',
  login: 'ivanova',
  name: 'Мария Иванова',
  phone: '+7 (910) 155-24-70',
  role: 'admin',
  employment: null,
  inn: null,
  permissions: ['leads', 'clients', 'data_delete'],
  active: true,
  createdAt: '2026-09-01T09:00:00.000Z',
  lastLoginAt: '2026-09-07T07:40:00.000Z',
};

/** Только что заведённый администратор: не открыто ничего, кроме профиля. */
export const administratorWithoutRights: StaffDetails = {
  ...administrator,
  id: 'u10',
  login: 'petrova',
  name: 'Анна Петрова',
  permissions: [],
  lastLoginAt: null,
};

/** Второй владелец компании во всём, кроме роли: открыто всё. */
export const administratorWithAllRights: StaffDetails = {
  ...administrator,
  id: 'u11',
  login: 'zaharova',
  name: 'Ольга Захарова',
  permissions: [...PANEL_SECTION_PERMISSIONS, ...DANGEROUS_PERMISSIONS],
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
  /* 🔴 Пусто и у владельца: разрешения — это переключатели **над ним**, а не
     его собственные. Полный набор в базе у него есть (миграция), но экрану
     прав он не показывается — настраивать владельцу нечего (ADR-344). */
  permissions: [],
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

/**
 * Загрузка недели по монтажникам: норма — рабочее окно 09–19 на пять дней,
 * то есть 3000 минут. У Иванова переработка — она обязана быть видна в
 * историях и в снимках, иначе её оформление никто не проверит.
 */
export const staffLoadFixture: ReadonlyMap<string, StaffRowStats> = new Map([
  [
    'u2',
    {
      loadMin: 1920,
      normMin: 3000,
      overtimeMin: 0,
      done: 7,
      earned: 42_000,
      deductionSum: 0,
      /* Наряды за человеком есть — удаление учётной записи закрыто. */
      orders: 9,
    },
  ],
  [
    'u5',
    {
      loadMin: 3240,
      normMin: 3000,
      overtimeMin: 240,
      done: 6,
      earned: 36_000,
      deductionSum: 3_000,
      orders: 8,
    },
  ],
  [
    'u3',
    {
      loadMin: 0,
      normMin: 3000,
      overtimeMin: 0,
      done: 0,
      earned: 0,
      deductionSum: 0,
      /* Ни одного наряда: только такую запись и можно удалить. */
      orders: 0,
    },
  ],
]);

export const acceptingApi: StaffApi = {
  create: async () => ({ ok: true }),
  update: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
  setAccess: async () => ({ ok: true }),
  addNote: async () => ({ ok: true }),
  removeNote: async () => ({ ok: true }),
};

/**
 * Ответ, который не приходит: история отправки.
 *
 * 🔴 Состояние «сохраняем» иначе не увидеть — принимающий шов отвечает
 * мгновенно, и кадр застаёт уже сохранённое. Показать заблокированные
 * переключатели и индикатор на кнопке можно только так.
 */
export const pendingApi: StaffApi = {
  ...acceptingApi,
  setAccess: () => new Promise(() => undefined),
};

const refused = { ok: false, message: 'Такой логин уже занят' } as const;

export const failingApi: StaffApi = {
  create: async () => refused,
  update: async () => refused,
  remove: async () => refused,
  setAccess: async () => refused,
  addNote: async () => refused,
  removeNote: async () => refused,
};

/**
 * Отказ на правке прав — свой текст: «логин занят» здесь ничего не объясняет.
 */
export const accessRefusingApi: StaffApi = {
  ...acceptingApi,
  setAccess: async () => ({
    ok: false,
    message: 'Сервер не принял изменения. Попробуйте ещё раз',
  }),
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
  setAccess: async () => refused,
  addNote: async () => refused,
  removeNote: async () => refused,
};

/**
 * Наряды монтажника: два выполненных и один в работе.
 *
 * 🔴 У удержания есть основание — запись без него показывается как дефект
 * данных, а не как ноль (CRM.md §9, ADR-114). Суммы демонстрационные:
 * настоящие приходят из нарядов (инвариант 8).
 *
 * Именованные записи, а не индексы массива: история, которой нужен именно
 * наряд с удержанием, не должна знать, каким он идёт по счёту.
 */
export const paidOrder: StaffOrder = {
  id: 'o1',
  number: 1059,
  type: 'install',
  status: 'done',
  at: '2026-08-14T07:00:00.000Z',
  address: 'Тула, ул. Токарева, 88, кв. 204',
  clientName: 'Жуков Кирилл',
  fee: 14000,
  deduction: 0,
  deductionReason: null,
};

export const heldOrder: StaffOrder = {
  id: 'o2',
  number: 1064,
  type: 'service',
  status: 'done',
  at: '2026-08-22T09:30:00.000Z',
  address: 'Тула, Красноармейский проспект, 12',
  clientName: 'Дёмин Алексей Юрьевич',
  fee: 9000,
  deduction: 1500,
  deductionReason: 'Повторный выезд по той же неисправности за счёт компании',
};

export const runningOrder: StaffOrder = {
  id: 'o3',
  number: 1071,
  type: 'repair',
  status: 'in_progress',
  at: '2026-09-04T06:00:00.000Z',
  address: 'Тула, ул. Демонстрации, 1',
  clientName: 'Салон «Аврора»',
  fee: 6000,
  deduction: 0,
  deductionReason: null,
};

export const staffOrders: readonly StaffOrder[] = [paidOrder, heldOrder, runningOrder];

/** Удержание без основания — дефект данных: экран называет его словами. */
export const orderWithoutReason: StaffOrder = {
  ...heldOrder,
  id: 'o4',
  number: 1080,
  deductionReason: null,
};

export const staffTotals: StaffTotals = {
  done: 2,
  active: 1,
  feeDone: 23000,
  deductions: 1500,
};

export const emptyTotals: StaffTotals = { done: 0, active: 0, feeDone: 0, deductions: 0 };
