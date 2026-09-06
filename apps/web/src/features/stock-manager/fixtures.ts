/**
 * Данные для историй и тестов раздела склада.
 *
 * 🔴 Названия зон здесь — фикстура, а не умолчание кода: в самом разделе ни
 * одного названия нет, свой гараж владелец называет сам (инвариант 8).
 */
import { STOCK_PAGE_SIZES } from './model';
import type {
  StockApi,
  StockItemCard,
  StockMoveDraft,
  StockItemProduct,
  StockItemRef,
  StockMovementCard,
  StockMovementPage,
  StockOverview,
  StockZoneCard,
  StockZonePerson,
} from './model';

export const warehouse: StockZoneCard = {
  id: 'z1',
  kind: 'warehouse',
  name: 'Гараж на Демидовской',
  userId: null,
  userName: null,
  sort: 0,
  archived: false,
};

export const van: StockZoneCard = {
  id: 'z2',
  kind: 'van',
  name: 'Газель',
  userId: 'u2',
  userName: 'Дмитрий Соколов',
  sort: 1,
  archived: false,
};

const secondVan: StockZoneCard = {
  id: 'z3',
  kind: 'van',
  name: 'Ларгус',
  userId: 'u3',
  userName: 'Сергей Панин',
  sort: 2,
  archived: false,
};

export const zones: readonly StockZoneCard[] = [warehouse, van, secondVan];

/** Машина продана: колонка ушла в архив, движения по ней остались. */
export const archivedZone: StockZoneCard = { ...secondVan, id: 'z4', name: 'Ока', archived: true };

/** Хозяин уволен — связь потеряна, зону нужно переназначить. */
export const orphanZone: StockZoneCard = {
  ...van,
  id: 'z5',
  name: 'Вторая машина',
  userId: null,
  userName: null,
};

export const people: readonly StockZonePerson[] = [
  { id: 'u2', name: 'Дмитрий Соколов' },
  { id: 'u3', name: 'Сергей Панин' },
];

export const products: readonly StockItemProduct[] = [
  { id: 'p1', name: 'Сплит-система 09', slug: 'split-09' },
  { id: 'p2', name: 'Сплит-система 12', slug: 'split-12' },
];

/** Расходник с запасом: обычная строка таблицы. */
export const pipe: StockItemCard = {
  id: 's1',
  name: 'Труба медная 1/4″',
  group: 'Медная труба',
  unit: 'meter',
  note: null,
  archived: false,
  product: null,
  byZone: { z1: 43.5, z2: 12, z3: 0 },
  total: 55.5,
  minQty: 30,
  low: false,
  near: false,
};

/** Опустилась ниже порога: это и есть список «пора заказывать». */
export const bracket: StockItemCard = {
  id: 's2',
  name: 'Кронштейны 450×450',
  group: 'Крепёж',
  unit: 'pair',
  note: 'Ставятся парой, брать с запасом',
  archived: false,
  product: null,
  byZone: { z1: 2, z2: 1, z3: 0 },
  total: 3,
  minQty: 6,
  low: true,
  near: false,
};

/** Списали больше, чем числилось: склад разошёлся с реальностью (ADR-134). */
export const freon: StockItemCard = {
  id: 's3',
  name: 'Фреон R32',
  group: 'Фреон',
  unit: 'kilogram',
  note: null,
  archived: false,
  product: null,
  byZone: { z1: 6.2, z2: -1.5, z3: 0 },
  total: 4.7,
  /* 4,7 при пороге 4 — ещё не «ниже порога», но следующий выезд уведёт туда:
     это и есть «подходит к порогу» (issue #606). */
  minQty: 4,
  low: false,
  near: true,
};

/** Техника: позиция ссылается на модель каталога. */
export const unit: StockItemCard = {
  id: 's4',
  name: 'Сплит-система 09',
  group: null,
  unit: 'piece',
  note: null,
  archived: false,
  product: products[0] ?? null,
  byZone: { z1: 2, z2: 0, z3: 0 },
  total: 2,
  minQty: 0,
  low: false,
  near: false,
};

export const items: readonly StockItemCard[] = [pipe, bracket, freon, unit];

export const archivedItem: StockItemCard = { ...pipe, id: 's5', archived: true };

export const overview: StockOverview = {
  zones,
  items,
  groups: ['Крепёж', 'Медная труба', 'Фреон'],
  total: 4,
  page: 1,
  pages: 1,
  size: STOCK_PAGE_SIZES[1],
  itemsTotal: 4,
  lowCount: 1,
  nearCount: 1,
};

/** Справочник перерос страницу: разбивка обязана появиться. */
export const longOverview: StockOverview = {
  ...overview,
  total: 47,
  itemsTotal: 47,
  page: 2,
  pages: 3,
};

/** Позиций нет вовсе — справочник пуст. */
export const emptyOverview: StockOverview = {
  ...overview,
  items: [],
  groups: [],
  total: 0,
  itemsTotal: 0,
  pages: 1,
  lowCount: 0,
  nearCount: 0,
};

/** 🔴 Зон нет: раздел объясняет, что заводят сначала. */
export const noZonesOverview: StockOverview = {
  ...emptyOverview,
  zones: [],
};

/**
 * Тот же ответ глазами монтажника: порога заказа и признака «к заказу» в нём
 * нет вовсе — это владельческие ключи (docs/API.md §14). Ключи собраны
 * перечислением, а не выброшены из копии: «нет ключа» и «ключ со значением
 * `undefined`» — разные ответы, и первый нужно уметь показать.
 */
export const noThresholdOverview: StockOverview = {
  zones,
  items: items.map((item) => ({
    id: item.id,
    name: item.name,
    group: item.group,
    unit: item.unit,
    note: item.note,
    archived: item.archived,
    product: item.product,
    byZone: item.byZone,
    total: item.total,
  })),
  groups: overview.groups,
  total: overview.total,
  page: 1,
  pages: 1,
  size: overview.size,
  itemsTotal: overview.itemsTotal,
};

export const itemRefs: readonly StockItemRef[] = items.map((item) => ({
  id: item.id,
  name: item.name,
  unit: item.unit,
}));

/**
 * Что подставил адрес окна после перетаскивания ячейки: позиция и обе зоны
 * известны, вводят одно количество (ADR-137).
 */
export const moveDraft: StockMoveDraft = {
  kind: 'transfer',
  itemId: pipe.id,
  qty: '',
  fromZoneId: warehouse.id,
  toZoneId: van.id,
  serials: '',
  reason: '',
};

export const incomeMove: StockMovementCard = {
  id: 'm1',
  kind: 'income',
  qty: 50,
  item: { id: pipe.id, name: pipe.name, unit: pipe.unit },
  fromZone: null,
  toZone: { id: warehouse.id, name: warehouse.name },
  order: null,
  serials: null,
  reason: 'Накладная 4517',
  authorName: 'Иван Петров',
  createdAt: '2026-08-20T07:15:00.000Z',
};

/** Утром загрузили машину — рядовая операция дня. */
export const transferMove: StockMovementCard = {
  id: 'm2',
  kind: 'transfer',
  qty: 15,
  item: { id: pipe.id, name: pipe.name, unit: pipe.unit },
  fromZone: { id: warehouse.id, name: warehouse.name },
  toZone: { id: van.id, name: van.name },
  order: null,
  serials: null,
  reason: null,
  authorName: 'Иван Петров',
  createdAt: '2026-08-24T05:40:00.000Z',
};

/** Списание в наряд: заводится из карточки наряда, а не из склада. */
export const consumeMove: StockMovementCard = {
  id: 'm3',
  kind: 'consume',
  qty: 4,
  item: { id: pipe.id, name: pipe.name, unit: pipe.unit },
  fromZone: { id: van.id, name: van.name },
  toZone: null,
  order: { id: 'o1', number: 1059 },
  serials: null,
  reason: null,
  authorName: 'Дмитрий Соколов',
  createdAt: '2026-08-26T09:12:00.000Z',
};

/** 🔴 Инвентаризация: поправка со знаком и обязательное основание. */
export const countMove: StockMovementCard = {
  id: 'm4',
  kind: 'count',
  qty: -2.5,
  item: { id: pipe.id, name: pipe.name, unit: pipe.unit },
  fromZone: null,
  toZone: { id: warehouse.id, name: warehouse.name },
  order: null,
  serials: null,
  reason: 'Пересчёт после инвентаризации: обрезки не списывали',
  authorName: null,
  createdAt: '2026-08-27T06:00:00.000Z',
};

/** Автор удалён: журнал переживает увольнение того, кто провёл движение. */
export const authorlessMove: StockMovementCard = {
  ...transferMove,
  id: 'm5',
  authorName: null,
};

export const movements: readonly StockMovementCard[] = [
  incomeMove,
  transferMove,
  consumeMove,
  countMove,
];

export const journal: StockMovementPage = {
  items: movements,
  total: movements.length,
  page: 1,
  pages: 1,
};

/** Журнал длиннее страницы: разбивка обязана появиться. */
export const longJournal: StockMovementPage = { ...journal, total: 19, page: 2, pages: 3 };

export const emptyJournal: StockMovementPage = { items: [], total: 0, page: 1, pages: 1 };

export const acceptingApi: StockApi = {
  createItem: async () => ({ ok: true }),
  updateItem: async () => ({ ok: true }),
  archiveItem: async () => ({ ok: true }),
  createZone: async () => ({ ok: true }),
  updateZone: async () => ({ ok: true }),
  archiveZone: async () => ({ ok: true }),
  move: async () => ({ ok: true }),
};

/** Отправка, которая не заканчивается: состояние `sending` в историях. */
const never = (): Promise<never> => new Promise<never>(() => {});

export const pendingApi: StockApi = {
  createItem: never,
  updateItem: never,
  archiveItem: never,
  createZone: never,
  updateZone: never,
  archiveZone: never,
  move: never,
};

const duplicate = {
  ok: false,
  message: 'Позиция с таким названием уже заведена',
  field: 'name',
} as const;

const refused = {
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
} as const;

export const failingApi: StockApi = {
  createItem: async () => duplicate,
  updateItem: async () => duplicate,
  archiveItem: async () => refused,
  createZone: async () => duplicate,
  updateZone: async () => duplicate,
  archiveZone: async () => refused,
  move: async () => refused,
};
