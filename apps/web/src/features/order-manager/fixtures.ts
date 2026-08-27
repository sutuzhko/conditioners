/** Данные для историй и тестов раздела заказов. */
import { orderDraftOf } from './model';
import type {
  OrderApi,
  OrderBlock,
  OrderCard,
  OrderChecklistCard,
  OrderClientRef,
  OrderDetails,
  OrderDocCard,
  OrderDraft,
  OrderHistoryEntry,
  OrderInstallerRef,
  OrderPage,
  OrderPhotoCard,
  OrderUnitCard,
  OrderUnitDraft,
  OrderWorkApi,
} from './model';

export const clientRef: OrderClientRef = {
  id: 'c1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
};

export const secondClientRef: OrderClientRef = {
  id: 'c2',
  name: 'Пётр Ильин',
  phone: '+7 (953) 100-20-30',
};

export const clients: readonly OrderClientRef[] = [clientRef, secondClientRef];

/** Самозанятый: удержание у него законно уменьшает вознаграждение. */
export const selfEmployedInstaller: OrderInstallerRef = {
  id: 'u2',
  name: 'Дмитрий Соколов',
  login: 'sokolov',
  employment: 'self_employed',
};

/** 🔴 Работник по трудовому договору: удержание — только внутренняя пометка. */
export const staffInstaller: OrderInstallerRef = {
  id: 'u3',
  name: 'Артём Белов',
  login: 'belov',
  employment: 'staff',
};

/** Оформление не заведено — ведём себя как при трудовом договоре. */
export const unknownInstaller: OrderInstallerRef = {
  id: 'u4',
  name: null,
  login: 'petrov',
  employment: null,
};

export const installers: readonly OrderInstallerRef[] = [
  selfEmployedInstaller,
  staffInstaller,
  unknownInstaller,
];

export const units: readonly OrderUnitCard[] = [
  {
    id: 'unit-a',
    equip: 'conditioner',
    model: 'Сплит-система 09',
    source: 'ours',
    trassaM: 4,
    diameter: '1/4–3/8',
    shtrob: true,
    sort: 0,
  },
  {
    id: 'unit-b',
    equip: 'conditioner',
    model: 'Блок клиента, 12-я модель',
    source: 'client',
    trassaM: 6,
    diameter: '1/4–1/2',
    shtrob: false,
    sort: 1,
  },
];

/** Пустой итог — наряд, по которому ещё не отчитывались. */
const noResult = { extraWork: null, report: null, resultAt: null } as const;

/** Наряд глазами владельца: с заметкой, удержанием и суммой заказа. */
export const order: OrderCard = {
  ...noResult,
  id: 'o1',
  number: 1059,
  type: 'install',
  status: 'assigned',
  client: clientRef,
  installer: selfEmployedInstaller,
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '24К',
  phone2: null,
  floor: 5,
  heightWorks: true,
  payment: 'company',
  price: 38_500,
  installerFee: 9_000,
  deductionSum: 0,
  deductionReason: null,
  comment: 'Домофон не работает, звонить на телефон за пятнадцать минут.',
  ownerNote: 'Клиент постоянный, скидку не даём',
  leadId: null,
  units,
  createdAt: '2026-08-26T14:00:00.000Z',
};

/** Только заведён: ни монтажника, ни позиций — что везти, выяснится на замере. */
export const freshOrder: OrderCard = {
  ...order,
  id: 'o2',
  number: 1060,
  status: 'new',
  type: 'service',
  client: secondClientRef,
  installer: null,
  at: '2026-08-29T06:30:00.000Z',
  durationMin: 90,
  address: 'Тула, Октябрьская, 3',
  intercom: null,
  floor: null,
  heightWorks: false,
  price: 4_500,
  installerFee: 2_000,
  comment: null,
  ownerNote: null,
  units: [],
};

/** Отказ: работа осталась в истории, но денег по ней нет. */
export const cancelledOrder: OrderCard = {
  ...freshOrder,
  id: 'o3',
  number: 1041,
  status: 'cancelled',
  type: 'repair',
  installer: staffInstaller,
  price: 0,
  installerFee: 0,
  deductionSum: 1_500,
  deductionReason: 'Сорван выезд без предупреждения',
};

/**
 * Наряд глазами монтажника: закрытых полей в объекте нет вовсе.
 *
 * 🔴 Ключей `ownerNote`, `deductionSum` и `deductionReason` здесь нет, а не
 * стоит `null`: `null` сообщал бы, что поле есть и оно пустое, — монтажнику
 * не положено знать даже этого (docs/API.md §13).
 */
const installerBase = {
  ...noResult,
  id: 'o1',
  number: 1059,
  type: 'install',
  status: 'assigned',
  client: clientRef,
  installer: selfEmployedInstaller,
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '24К',
  phone2: '+7 (953) 100-20-30',
  floor: 5,
  heightWorks: true,
  installerFee: 9_000,
  comment: 'Домофон не работает, звонить на телефон за пятнадцать минут.',
  leadId: null,
  units,
  createdAt: '2026-08-26T14:00:00.000Z',
} as const;

/** Оплата наличными: сумму заказа монтажник видит — её нужно принять. */
export const installerOrder: OrderCard = {
  ...installerBase,
  payment: 'cash_to_installer',
  price: 38_500,
};

/** Платит компания — суммы заказа монтажнику не приходит вовсе. */
export const installerCompanyOrder: OrderCard = {
  ...installerBase,
  payment: 'company',
};

export const page: OrderPage = {
  items: [order, freshOrder, cancelledOrder],
  total: 3,
  page: 1,
  pages: 1,
};

/** Список перерос страницу: разбивка обязана появиться. */
export const longPage: OrderPage = {
  items: [order, freshOrder],
  total: 19,
  page: 2,
  pages: 3,
};

export const emptyPage: OrderPage = { items: [], total: 0, page: 1, pages: 1 };

/** Длинные данные: адрес, комментарий и имя не должны рвать карточку. */
export const longOrder: OrderCard = {
  ...order,
  id: 'o4',
  number: 100_412,
  client: {
    id: 'c9',
    name: 'Александра Константинопольская-Черноморская',
    phone: '+7 (4872) 12-34-56',
  },
  address:
    'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145, второй подъезд',
  comment:
    'Домофон не работает, звонить на телефон за пятнадцать минут. Пятый этаж без лифта, узкая лестница — блок заносить вдвоём. Во дворе собака, но не кусается.',
  ownerNote:
    'Клиент постоянный: третий кондиционер за два года. Скидку не даём, но материалы считаем по себестоимости.',
  durationMin: 465,
};

export const acceptingApi: OrderApi = {
  create: async () => ({ ok: true, id: 'o9' }),
  update: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
  setStatus: async () => ({ ok: true }),
};

/** 🔴 Сервер называет поле: удержание без основания не записывается. */
const noReason = {
  ok: false,
  message: 'Укажите основание удержания',
  field: 'deductionReason',
} as const;

export const failingApi: OrderApi = {
  create: async () => noReason,
  update: async () => noReason,
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  setStatus: async () => ({ ok: false, message: 'Такой переход монтажнику недоступен' }),
};

/** Запрос, который не отвечает: история показывает состояние отправки. */
const stuck = (): Promise<never> => new Promise(() => undefined);

export const pendingApi: OrderApi = {
  create: stuck,
  update: stuck,
  remove: stuck,
  setStatus: stuck,
};

/** Заполненный черновик формы — тот же наряд, но полями ввода. */
export const draft: OrderDraft = orderDraftOf(order);

/** 🔴 Тот же наряд у работника по трудовому договору: удержание не вычитается. */
export const staffDraft: OrderDraft = { ...draft, installerId: staffInstaller.id };

/** Наряд без назначенного монтажника: оформление неизвестно. */
export const unassignedDraft: OrderDraft = { ...draft, installerId: '' };

export const unitDrafts: readonly OrderUnitDraft[] = draft.units;

// ---------- Наряд в работе ----------

/**
 * Чеклист: собранные из наряда пункты и один дописанный.
 *
 * 🔴 Свой пункт в фикстуре не для красоты: именно он не должен исчезать при
 * пересборке, и история обязана его показывать.
 */
export const checklist: readonly OrderChecklistCard[] = [
  {
    id: 'ch1',
    text: 'Забрать со склада — Позиция 1, Сплит-система 09',
    done: true,
    own: false,
    sort: 0,
  },
  {
    id: 'ch2',
    text: 'Позиция 1, Сплит-система 09: медная трасса 4 м, диаметр 1/4–3/8',
    done: true,
    own: false,
    sort: 1,
  },
  { id: 'ch3', text: 'Перфоратор с бурами и удлинителем', done: false, own: false, sort: 2 },
  {
    id: 'ch4',
    text: 'Страховочная система и каска: работы на высоте',
    done: false,
    own: false,
    sort: 3,
  },
  { id: 'ch5', text: 'Чехлы на мебель и пылесос', done: false, own: true, sort: 4 },
];

export const docs: readonly OrderDocCard[] = [
  {
    id: 'd1',
    kind: 'contract',
    name: 'Договор 1059.pdf',
    url: '/api/admin/orders/o1/docs/d1/file',
    sizeBytes: 184_320,
    createdAt: '2026-08-26T15:00:00.000Z',
  },
  {
    id: 'd2',
    kind: 'measure',
    name: 'Замерный лист.jpg',
    url: '/api/admin/orders/o1/docs/d2/file',
    sizeBytes: 921_600,
    createdAt: '2026-08-27T09:10:00.000Z',
  },
];

export const photos: readonly OrderPhotoCard[] = [
  { id: 'p1', stage: 'before', url: '/api/media/before-1.jpg', sort: 0 },
  { id: 'p2', stage: 'after', url: '/api/media/after-1.jpg', sort: 0 },
  { id: 'p3', stage: 'after', url: '/api/media/after-2.jpg', sort: 1 },
];

export const history: readonly OrderHistoryEntry[] = [
  {
    id: 'h3',
    text: 'Выполнен',
    author: 'Дмитрий Соколов',
    createdAt: '2026-08-28T12:40:00.000Z',
  },
  {
    id: 'h2',
    text: 'Взят в работу',
    author: 'Дмитрий Соколов',
    createdAt: '2026-08-28T08:05:00.000Z',
  },
  { id: 'h1', text: 'Наряд заведён', author: null, createdAt: '2026-08-26T14:00:00.000Z' },
];

/** Наряд со всей работой: чеклист, бумаги, снимки и история. */
export const orderDetails: OrderDetails = {
  ...order,
  extraWork: 'Два метра трассы сверх сметы, кронштейн усиленный',
  report: 'Блок повешен, вакуумирование 20 минут, проверен на охлаждение. Клиенту показан пульт.',
  resultAt: '2026-08-28T12:35:00.000Z',
  checklist,
  docs,
  photos,
  history,
};

/** 🔴 То же глазами монтажника: ни заметки владельца, ни истории наряда. */
export const installerDetails: OrderDetails = {
  ...installerOrder,
  extraWork: null,
  report: null,
  resultAt: null,
  checklist,
  docs,
  photos,
};

/** Занятость: день закрыт целиком и отдельное окно у второго монтажника. */
export const blocks: readonly OrderBlock[] = [
  {
    userId: selfEmployedInstaller.id,
    repeat: 'once',
    day: '2026-08-28',
    weekday: null,
    fromMin: null,
    toMin: null,
    reason: 'Семейные дела',
  },
  {
    userId: staffInstaller.id,
    repeat: 'once',
    day: '2026-08-28',
    weekday: null,
    fromMin: 14 * 60,
    toMin: 16 * 60,
    reason: 'Врач',
  },
];

export const acceptingWorkApi: OrderWorkApi = {
  saveResult: async () => ({ ok: true }),
  addItem: async () => ({ ok: true }),
  setItemDone: async () => ({ ok: true }),
  removeItem: async () => ({ ok: true }),
  rebuildChecklist: async () => ({ ok: true }),
  addDoc: async () => ({ ok: true }),
  removeDoc: async () => ({ ok: true }),
  addPhoto: async () => ({ ok: true }),
  removePhoto: async () => ({ ok: true }),
};

const refused = { ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' } as const;

export const failingWorkApi: OrderWorkApi = {
  saveResult: async () => refused,
  addItem: async () => ({ ok: false, message: 'Напишите, что взять', field: 'text' }),
  setItemDone: async () => refused,
  removeItem: async () => ({
    ok: false,
    message: 'Этот пункт собран из наряда — уберите его правкой наряда, а не из списка',
  }),
  rebuildChecklist: async () => refused,
  addDoc: async () => ({
    ok: false,
    message: 'Документ принимается в PDF или снимком в JPEG, PNG и WebP',
    field: 'file',
  }),
  removeDoc: async () => refused,
  addPhoto: async () => ({ ok: false, message: 'Фото места установки загружает владелец' }),
  removePhoto: async () => refused,
};

export const pendingWorkApi: OrderWorkApi = {
  saveResult: stuck,
  addItem: stuck,
  setItemDone: stuck,
  removeItem: stuck,
  rebuildChecklist: stuck,
  addDoc: stuck,
  removeDoc: stuck,
  addPhoto: stuck,
  removePhoto: stuck,
};
