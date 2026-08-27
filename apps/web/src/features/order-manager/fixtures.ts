/** Данные для историй и тестов раздела заказов. */
import { consumptionHints, orderDraftOf } from './model';
import type {
  ConsumptionHint,
  OrderApi,
  OrderBlock,
  OrderCard,
  OrderChecklistCard,
  OrderClientRef,
  OrderConsumptionApi,
  OrderDetails,
  OrderDocCard,
  OrderDraft,
  OrderHistoryEntry,
  OrderInstallerRef,
  OrderPage,
  OrderPhotoCard,
  OrderResult,
  OrderUnitCard,
  OrderUnitDraft,
  OrderWorkApi,
  StockDirectory,
  StockItemCard,
  StockMovementCard,
  StockZoneCard,
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
  overtimeMin: 0,
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
  overtimeMin: 0,
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
  overtimeMin: 0,
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

/**
 * Наряд, вышедший за рабочее окно: выезд на пять с половиной часов от четырёх
 * дня, а окно закрывается в семь. Два часа с четвертью — переработка, и она
 * посчитана сервером на момент записи (ADR-138).
 */
export const overtimeOrder: OrderCard = {
  ...order,
  id: 'o5',
  number: 1061,
  at: '2026-08-28T13:00:00.000Z',
  durationMin: 5 * 60 + 15,
  overtimeMin: 2 * 60 + 15,
};

/** Та же переработка глазами монтажника: это его часы, и он их видит. */
export const installerOvertimeOrder: OrderCard = {
  ...installerOrder,
  at: '2026-08-28T13:00:00.000Z',
  durationMin: 5 * 60 + 15,
  overtimeMin: 2 * 60 + 15,
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
  overtimeMin: 0,
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

// ---------- Расход материалов ----------

export const stockWarehouse: StockZoneCard = {
  id: 'z1',
  kind: 'warehouse',
  name: 'Гараж',
  userId: null,
  userName: null,
  sort: 0,
  archived: false,
};

export const stockVan: StockZoneCard = {
  id: 'z2',
  kind: 'van',
  name: 'Газель',
  userId: selfEmployedInstaller.id,
  userName: selfEmployedInstaller.name,
  sort: 1,
  archived: false,
};

export const stockZones: readonly StockZoneCard[] = [stockWarehouse, stockVan];

/**
 * 🔴 Зоны глазами монтажника: только его машина. Гаража здесь нет вовсе — не
 * скрыт кнопкой, а не прислан сервером (ADR-134).
 */
export const installerZones: readonly StockZoneCard[] = [stockVan];

/**
 * Справочник склада.
 *
 * 🔴 Ключей `minQty` и `low` в позициях нет: их не кладут в ответ монтажнику,
 * и блок расхода их не читает ни у кого — фикстура обязана это показывать.
 */
export const stockItems: readonly StockItemCard[] = [
  {
    id: 's1',
    name: 'Труба медная 1/4″',
    group: 'Медная труба',
    unit: 'meter',
    note: null,
    archived: false,
    product: null,
    byZone: { z1: 43.5, z2: 12 },
    total: 55.5,
  },
  {
    id: 's2',
    name: 'Кронштейны наружного блока',
    group: 'Крепёж',
    unit: 'pair',
    note: null,
    archived: false,
    product: null,
    byZone: { z1: 6, z2: 2 },
    total: 8,
  },
  {
    id: 's3',
    name: 'Фреон R32',
    group: 'Фреон',
    unit: 'kilogram',
    note: 'Баллон 13,6 кг',
    archived: false,
    product: null,
    byZone: { z1: 9.5, z2: 1.2 },
    total: 10.7,
  },
  /* Техника: ссылается на модель каталога — у неё спрашивают серийники. */
  {
    id: 's4',
    name: 'Сплит-система 09',
    group: 'Техника',
    unit: 'piece',
    note: null,
    archived: false,
    product: { id: 'p1', name: 'Сплит-система 09', slug: 'split-09' },
    byZone: { z1: 3, z2: 1 },
    total: 4,
  },
  /* Архивная позиция: в выбор не попадает и подсказок не даёт. */
  {
    id: 's5',
    name: 'Короб ПВХ 60×60',
    group: 'Короб ПВХ',
    unit: 'meter',
    note: null,
    archived: true,
    product: null,
    byZone: { z1: 0, z2: 0 },
    total: 0,
  },
];

/** 🔴 Тот же справочник, но остаток трассы в машине ушёл в минус. */
export const shortStockItems: readonly StockItemCard[] = stockItems.map((item) =>
  item.id === 's1' ? { ...item, byZone: { z1: 43.5, z2: -3.5 }, total: 40 } : item,
);

export const stockDirectory: StockDirectory = { zones: stockZones, items: stockItems };

/** Склад глазами монтажника: одна зона, остаток по ней. */
export const installerDirectory: StockDirectory = { zones: installerZones, items: stockItems };

export const shortDirectory: StockDirectory = { zones: stockZones, items: shortStockItems };

/** Ни одной зоны: машину монтажнику ещё не завели — списывать неоткуда. */
export const zonelessDirectory: StockDirectory = { zones: [], items: [] };

const consumeOrder = { id: order.id, number: order.number };

/**
 * Движения склада по наряду: три списания и один возврат.
 *
 * 🔴 Возврат стоит отдельной строкой, а не стирает списание: журнал движений
 * не переписывается, и в нём видно и ошибку, и её исправление.
 */
export const consumptionMoves: readonly StockMovementCard[] = [
  {
    id: 'm1',
    kind: 'consume',
    qty: 4,
    item: { id: 's1', name: 'Труба медная 1/4″', unit: 'meter' },
    fromZone: { id: 'z2', name: 'Газель' },
    toZone: null,
    order: consumeOrder,
    serials: null,
    reason: null,
    authorName: 'Дмитрий Соколов',
    createdAt: '2026-08-28T09:12:00.000Z',
  },
  {
    id: 'm2',
    kind: 'consume',
    qty: 1,
    item: { id: 's4', name: 'Сплит-система 09', unit: 'piece' },
    fromZone: { id: 'z2', name: 'Газель' },
    toZone: null,
    order: consumeOrder,
    serials: 'SN-4412-8890',
    reason: null,
    authorName: 'Дмитрий Соколов',
    createdAt: '2026-08-28T09:20:00.000Z',
  },
  {
    id: 'm3',
    kind: 'consume',
    qty: 2,
    item: { id: 's2', name: 'Кронштейны наружного блока', unit: 'pair' },
    fromZone: { id: 'z2', name: 'Газель' },
    toZone: null,
    order: consumeOrder,
    serials: null,
    reason: null,
    authorName: null,
    createdAt: '2026-08-28T09:26:00.000Z',
  },
  {
    id: 'm4',
    kind: 'return',
    qty: 1,
    item: { id: 's2', name: 'Кронштейны наружного блока', unit: 'pair' },
    fromZone: null,
    toZone: { id: 'z2', name: 'Газель' },
    order: consumeOrder,
    serials: null,
    reason: 'Ошиблись при списании',
    authorName: 'Дмитрий Соколов',
    createdAt: '2026-08-28T09:35:00.000Z',
  },
];

/** Чеклист, в котором двум пунктам сборов нашлись позиции склада. */
export const stockChecklist: readonly OrderChecklistCard[] = [
  ...checklist,
  {
    id: 'ch6',
    text: 'Кронштейны наружного блока — пара с анкерами',
    done: false,
    own: true,
    sort: 5,
  },
];

export const stockHints: readonly ConsumptionHint[] = consumptionHints(stockChecklist, stockItems);

const consumeOk = async (): Promise<OrderResult> => ({ ok: true });

export const acceptingConsumptionApi: OrderConsumptionApi = {
  load: async () => ({ ok: true, moves: consumptionMoves, stock: stockDirectory }),
  consume: consumeOk,
  cancel: consumeOk,
};

/** Ничего не списано: блок объясняет, зачем списание нужно. */
export const emptyConsumptionApi: OrderConsumptionApi = {
  ...acceptingConsumptionApi,
  load: async () => ({ ok: true, moves: [], stock: stockDirectory }),
};

/** 🔴 Глазами монтажника: источник один — его машина, выбора зоны нет. */
export const installerConsumptionApi: OrderConsumptionApi = {
  ...acceptingConsumptionApi,
  load: async () => ({ ok: true, moves: consumptionMoves, stock: installerDirectory }),
};

/** 🔴 Минус на складе: предупреждение остаётся и после списания. */
export const minusConsumptionApi: OrderConsumptionApi = {
  ...acceptingConsumptionApi,
  load: async () => ({ ok: true, moves: consumptionMoves, stock: shortDirectory }),
};

/** Машину монтажнику ещё не завели: форма не рисуется, а объясняет почему. */
export const zonelessConsumptionApi: OrderConsumptionApi = {
  ...acceptingConsumptionApi,
  load: async () => ({ ok: true, moves: [], stock: zonelessDirectory }),
};

export const failingConsumptionApi: OrderConsumptionApi = {
  load: async () => ({ ok: true, moves: consumptionMoves, stock: stockDirectory }),
  consume: async () => ({
    ok: false,
    message: 'Этой позиции нет в справочнике склада',
    field: 'itemId',
  }),
  cancel: async () => ({
    ok: false,
    message: 'Наряд закрыт — вернуть материал на склад может только владелец',
  }),
};

/** Склад не ответил: блок предлагает повторить, а не показывает пустоту. */
export const brokenConsumptionApi: OrderConsumptionApi = {
  ...acceptingConsumptionApi,
  load: async () => ({
    ok: false,
    message: 'Не удалось получить расход материалов и остатки склада.',
  }),
};

export const pendingConsumptionApi: OrderConsumptionApi = {
  load: stuck,
  consume: stuck,
  cancel: stuck,
};

/** Отправка строки списания: успех, отказ и запрос, который не отвечает. */
export const acceptingConsume = consumeOk;

export const failingConsume = async (): Promise<OrderResult> => ({
  ok: false,
  message: 'Количество больше нуля',
  field: 'qty',
});

export const pendingConsume = stuck;
