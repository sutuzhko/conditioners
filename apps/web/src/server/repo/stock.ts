/**
 * Склад — docs/API.md §14, требования — docs/CRM.md §11, решения — ADR-111 и
 * ADR-134.
 *
 * 🔴 Остаток нигде не хранится: он всегда сумма движений. Считается агрегатом
 * в базе, а не чтением журнала в память — через год работы движений будут
 * десятки тысяч, и страница остатков не может зависеть от их числа.
 *
 * 🔴 Разграничение по роли живёт здесь, а не в разметке: владельцу — все зоны
 * и пороги заказа, монтажнику — только его машина и ни одного ключа про порог
 * (ADR-134). Ключ не приводится к `null`, а отсутствует вовсе: `null` сообщал
 * бы, что порог есть и он пустой, — а знать не положено даже этого.
 */
/* `Prisma` берётся значением, а не типом: `PrismaClientKnownRequestError` —
   класс, по нему отличается нарушение уникальности от любого другого сбоя. */
import { Prisma } from '@prisma/client';
import type {
  StockMoveKind as DbMoveKind,
  StockUnit as DbUnit,
  StockZoneKind as DbZoneKind,
} from '@prisma/client';
import {
  zoneOwnerIssue,
  type OrderConsume,
  type OrderConsumption,
  type StockItemCard,
  type StockItemDetails,
  type StockItemCreate,
  type StockItemUpdate,
  type StockMovementCard,
  type StockMovementCreate,
  type StockMoveKind,
  type StockDirectory,
  type StockOverview,
  type StockUnit,
  type StockZoneCard,
  type StockZoneCreate,
  type StockZoneKind,
  type StockZoneUpdate,
} from '@/entities/stock/model';
import { pageWindow, type Page } from '@/shared/lib/paging';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { enqueueNotification } from '@/server/notifications/queue';
import { requireAccess, type Viewer } from '@/server/repo/orders';

// ---------- Словари: база ↔ контракт ----------

const UNIT_TO_DB: Record<StockUnit, DbUnit> = {
  piece: 'PIECE',
  meter: 'METER',
  kilogram: 'KILOGRAM',
  liter: 'LITER',
  pair: 'PAIR',
  pack: 'PACK',
  coil: 'COIL',
  roll: 'ROLL',
  cylinder: 'CYLINDER',
};

const UNIT_FROM_DB: Record<DbUnit, StockUnit> = {
  PIECE: 'piece',
  METER: 'meter',
  KILOGRAM: 'kilogram',
  LITER: 'liter',
  PAIR: 'pair',
  PACK: 'pack',
  COIL: 'coil',
  ROLL: 'roll',
  CYLINDER: 'cylinder',
};

const ZONE_KIND_TO_DB: Record<StockZoneKind, DbZoneKind> = {
  warehouse: 'WAREHOUSE',
  van: 'VAN',
};

const ZONE_KIND_FROM_DB: Record<DbZoneKind, StockZoneKind> = {
  WAREHOUSE: 'warehouse',
  VAN: 'van',
};

const MOVE_KIND_TO_DB: Record<StockMoveKind, DbMoveKind> = {
  income: 'INCOME',
  transfer: 'TRANSFER',
  consume: 'CONSUME',
  return: 'RETURN',
  count: 'COUNT',
};

const MOVE_KIND_FROM_DB: Record<DbMoveKind, StockMoveKind> = {
  INCOME: 'income',
  TRANSFER: 'transfer',
  CONSUME: 'consume',
  RETURN: 'return',
  COUNT: 'count',
};

// ---------- Количества ----------

/**
 * Три знака после запятой — предел колонки в базе, и складывать остаток нужно
 * ровно с той же точностью. Без округления сумма движений в двоичной дробной
 * арифметике даёт «43,499999999999996» — и остаток, равный порогу, оказывается
 * то ниже его, то выше в зависимости от порядка слагаемых.
 */
const STEP = 1000;

function round3(value: number): number {
  return Math.round(value * STEP) / STEP;
}

/** 🔴 `Decimal` наружу не уходит: слой доступа к данным отдаёт число. */
function decimalToNumber(value: Prisma.Decimal | null): number {
  return value === null ? 0 : round3(value.toNumber());
}

// ---------- Зоны ----------

const zoneSelect = {
  id: true,
  kind: true,
  name: true,
  userId: true,
  user: { select: { name: true, login: true } },
  sort: true,
  archived: true,
} as const;

type ZoneRow = {
  id: string;
  kind: DbZoneKind;
  name: string;
  userId: string | null;
  user: { name: string | null; login: string } | null;
  sort: number;
  archived: boolean;
};

function toZoneCard(row: ZoneRow): StockZoneCard {
  return {
    id: row.id,
    kind: ZONE_KIND_FROM_DB[row.kind],
    name: row.name,
    userId: row.userId,
    /* Логин как запасная подпись: у заведённой второпях учётной записи имени
       может не быть, а колонка «машина неизвестно чья» ничего не объясняет. */
    userName: row.user === null ? null : (row.user.name ?? row.user.login),
    sort: row.sort,
    archived: row.archived,
  };
}

/**
 * 🔴 Монтажник видит только свои машины.
 *
 * Условие подмешивается в запрос, а не отсеивается после выборки: иначе
 * остаток гаража успевал бы попасть в память приложения по дороге к ответу, а
 * список зон у монтажника зависел бы от порядка строк в базе.
 */
function zoneWhere(viewer: Viewer, archived: boolean): Prisma.StockZoneWhereInput {
  if (viewer.role === 'installer') {
    return { archived: false, kind: 'VAN', userId: viewer.userId };
  }

  /* 🔴 Владелец видит архивные зоны, когда сам об этом просит: иначе архив
     становится удалением с лишним шагом — вернуть зону из него нечем, потому
     что до неё не добраться. Монтажнику архивные не показываются никогда:
     машины, которой нет, у него в списке быть не должно. */
  return archived ? {} : { archived: false };
}

/* Гараж первым, машины следом: колонка основного хранения читается слева, а
   не отыскивается среди машин. Порядок значений енума в Postgres — порядок их
   объявления в схеме. */
const ZONE_ORDER: Prisma.StockZoneOrderByWithRelationInput[] = [
  { kind: 'asc' },
  { sort: 'asc' },
  { name: 'asc' },
];

export async function zones(
  viewer: Viewer,
  options: { readonly archived?: boolean | undefined } = {},
): Promise<readonly StockZoneCard[]> {
  const rows = await db.stockZone.findMany({
    where: zoneWhere(viewer, options.archived === true),
    select: zoneSelect,
    orderBy: ZONE_ORDER,
  });

  return rows.map(toZoneCard);
}

/** Зоны, по которым считается порог заказа: он вопрос компании, а не машины. */
async function activeZoneIds(): Promise<readonly string[]> {
  const rows = await db.stockZone.findMany({ where: { archived: false }, select: { id: true } });
  return rows.map((row) => row.id);
}

/**
 * Машина принадлежит человеку. Без проверки Prisma ответила бы нарушением
 * внешнего ключа, и владелец увидел бы «не получилось обработать запрос»
 * вместо подсказки, какое поле исправить.
 */
async function assertZoneUser(userId: string | null): Promise<void> {
  if (userId === null) return;

  const user = await db.adminUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (user === null) {
    throw new ApiException('validation_error', 'Такого человека нет в команде', 'userId');
  }
}

export async function createZone(input: StockZoneCreate): Promise<StockZoneCard> {
  await assertZoneUser(input.userId);

  const row = await db.stockZone.create({
    data: {
      kind: ZONE_KIND_TO_DB[input.kind],
      name: input.name,
      userId: input.userId,
      sort: input.sort,
    },
    select: zoneSelect,
  });

  return toZoneCard(row);
}

export async function updateZone(id: string, input: StockZoneUpdate): Promise<StockZoneCard> {
  const found = await db.stockZone.findUnique({
    where: { id },
    select: { archived: true, kind: true, userId: true },
  });
  if (found === null) throw new ApiException('not_found', 'Зона не найдена');

  await assertZoneUser(input.userId ?? null);

  /* 🔴 Пара «вид зоны + хозяин» досматривается на итоговом состоянии: правка
     присылает половину пары, и вторую знает только база. Схема ловит
     противоречие, присланное одним запросом, а «сделать машину складом, не
     тронув хозяина» видно только здесь. */
  const kind = input.kind ?? ZONE_KIND_FROM_DB[found.kind];
  const userId = input.userId === undefined ? found.userId : input.userId;
  const message = zoneOwnerIssue(kind, userId);
  if (message !== null) throw new ApiException('validation_error', message, 'userId');

  if (input.archived === true && !found.archived) await assertZoneEmpty(id);

  const row = await db.stockZone.update({
    where: { id },
    /* Пишется только присланное: опущенный `sort` обнулялся и перетасовывал
       колонки таблицы остатков, опущенный `archived` возвращал зону из архива. */
    data: {
      ...(input.kind === undefined ? {} : { kind: ZONE_KIND_TO_DB[input.kind] }),
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.userId === undefined ? {} : { userId: input.userId }),
      ...(input.sort === undefined ? {} : { sort: input.sort }),
      ...(input.archived === undefined ? {} : { archived: input.archived }),
    },
    select: zoneSelect,
  });

  return toZoneCard(row);
}

/**
 * Зона не удаляется, а сдаётся в архив: удаление унесло бы историю движений,
 * ради которой склад и заводится (ADR-134).
 */
export async function archiveZone(id: string): Promise<void> {
  const found = await db.stockZone.findUnique({ where: { id }, select: { archived: true } });
  if (found === null) throw new ApiException('not_found', 'Зона не найдена');
  if (found.archived) return;

  await assertZoneEmpty(id);
  await db.stockZone.update({ where: { id }, data: { archived: true } });
}

// ---------- Остатки ----------

/** Остаток позиции по зонам: внешний ключ — позиция, внутренний — зона. */
type Balances = ReadonlyMap<string, ReadonlyMap<string, number>>;

function addBalance(
  balances: Map<string, Map<string, number>>,
  itemId: string,
  zoneId: string | null,
  qty: number,
): void {
  if (zoneId === null) return;

  const zonesOfItem = balances.get(itemId) ?? new Map<string, number>();
  zonesOfItem.set(zoneId, round3((zonesOfItem.get(zoneId) ?? 0) + qty));
  balances.set(itemId, zonesOfItem);
}

/**
 * 🔴 Остаток считает база, а не приложение.
 *
 * Два агрегата: сумма пришедшего в зону минус сумма ушедшего из неё. Знак
 * инвентаризации свой, и она приходит как поправка в `toZoneId` — поэтому
 * отдельной ветки ей не нужно.
 *
 * Отрицательный результат отдаётся как есть: уход в минус не запрещается, а
 * помечается — это сигнал «склад разошёлся с реальностью», и он честнее
 * запрета, который заставил бы монтажника вписать неправду (ADR-134).
 */
async function balancesOf(
  itemIds: readonly string[],
  zoneIds: readonly string[],
): Promise<Balances> {
  const balances = new Map<string, Map<string, number>>();
  if (itemIds.length === 0 || zoneIds.length === 0) return balances;

  const scope = { itemId: { in: [...itemIds] } };

  const [incoming, outgoing] = await Promise.all([
    db.stockMovement.groupBy({
      by: ['itemId', 'toZoneId'],
      where: { ...scope, toZoneId: { in: [...zoneIds] } },
      _sum: { qty: true },
    }),
    db.stockMovement.groupBy({
      by: ['itemId', 'fromZoneId'],
      where: { ...scope, fromZoneId: { in: [...zoneIds] } },
      _sum: { qty: true },
    }),
  ]);

  for (const row of incoming) {
    addBalance(balances, row.itemId, row.toZoneId, decimalToNumber(row._sum.qty));
  }
  for (const row of outgoing) {
    addBalance(balances, row.itemId, row.fromZoneId, -decimalToNumber(row._sum.qty));
  }

  return balances;
}

/** Итог по позиции — сумма по видимым зонам, поэтому у монтажника это его машина. */
function totalOf(byZone: Readonly<Record<string, number>>): number {
  return round3(Object.values(byZone).reduce((sum, qty) => sum + qty, 0));
}

/**
 * 🔴 Разбивка по зонам содержит все видимые зоны, включая нулевые: пустая
 * колонка — это ответ «здесь ничего нет», а не отсутствие данных.
 */
function byZoneOf(
  itemId: string,
  visible: readonly StockZoneCard[],
  balances: Balances,
): Readonly<Record<string, number>> {
  const zonesOfItem = balances.get(itemId);

  return Object.fromEntries(visible.map((zone) => [zone.id, zonesOfItem?.get(zone.id) ?? 0]));
}

// ---------- Позиции справочника ----------

const itemSelect = {
  id: true,
  name: true,
  group: true,
  unit: true,
  minQty: true,
  note: true,
  archived: true,
  product: { select: { id: true, name: true, slug: true } },
} as const;

type ItemRow = {
  id: string;
  name: string;
  group: string | null;
  unit: DbUnit;
  minQty: Prisma.Decimal;
  note: string | null;
  archived: boolean;
  product: { id: string; name: string; slug: string } | null;
};

/**
 * 🔴 Проекция позиции под роль смотрящего.
 *
 * `minQty` и `low` — владельческие ключи: порог заказа говорит о закупочных
 * привычках владельца, и открывать их всей команде он не обязан (ADR-134).
 */
function toItemCard(
  row: ItemRow,
  visible: readonly StockZoneCard[],
  balances: Balances,
  role: Viewer['role'],
): StockItemCard {
  const byZone = byZoneOf(row.id, visible, balances);
  const total = totalOf(byZone);

  const shared = {
    id: row.id,
    name: row.name,
    group: row.group,
    unit: UNIT_FROM_DB[row.unit],
    note: row.note,
    archived: row.archived,
    product: row.product,
    byZone,
    total,
  };

  if (role !== 'owner') return shared;

  const minQty = decimalToNumber(row.minQty);

  return { ...shared, minQty, low: isLow(total, minQty) };
}

/** Ноль — за позицией не следим: порог задаётся на позицию, а не общим числом. */
function isLow(total: number, minQty: number): boolean {
  return minQty > 0 && total < minQty;
}

/** Карточка одной позиции с её остатком: заведение, правка и открытие карточки. */
async function itemCardOf(row: ItemRow, viewer: Viewer): Promise<StockItemCard> {
  const visible = await zones(viewer);
  const balances = await balancesOf(
    [row.id],
    visible.map((zone) => zone.id),
  );

  return toItemCard(row, visible, balances, viewer.role);
}

async function assertProduct(productId: string | null): Promise<void> {
  if (productId === null) return;

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (product === null) {
    throw new ApiException('validation_error', 'Такой модели нет в каталоге', 'productId');
  }
}

export async function createItem(input: StockItemCreate, viewer: Viewer): Promise<StockItemCard> {
  await assertProduct(input.productId);

  const row = await db.stockItem.create({
    data: {
      name: input.name,
      group: input.group,
      unit: UNIT_TO_DB[input.unit],
      minQty: input.minQty,
      productId: input.productId,
      note: input.note,
    },
    select: itemSelect,
  });

  return itemCardOf(row, viewer);
}

export async function updateItem(
  id: string,
  input: StockItemUpdate,
  viewer: Viewer,
): Promise<StockItemCard> {
  const found = await db.stockItem.findUnique({
    where: { id },
    select: { archived: true, unit: true },
  });
  if (found === null) throw new ApiException('not_found', 'Позиция не найдена', 'id');

  await assertProduct(input.productId ?? null);
  if (input.archived === true && !found.archived) await assertItemEmpty(id);
  if (input.unit !== undefined && UNIT_TO_DB[input.unit] !== found.unit) {
    await assertNoMovements(id);
  }

  const row = await db.stockItem.update({
    where: { id },
    /* 🔴 Пишется только присланное. Схема заведения на `PATCH` работала полной
       заменой: опущенный `minQty` обнулял порог заказа, опущенный `archived`
       возвращал позицию из архива, а `group`, `note` и `productId` затирались
       в `null`. */
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.group === undefined ? {} : { group: input.group }),
      ...(input.unit === undefined ? {} : { unit: UNIT_TO_DB[input.unit] }),
      ...(input.minQty === undefined ? {} : { minQty: input.minQty }),
      ...(input.productId === undefined ? {} : { productId: input.productId }),
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.archived === undefined ? {} : { archived: input.archived }),
    },
    select: itemSelect,
  });

  return itemCardOf(row, viewer);
}

/**
 * 🔴 Единица измерения не меняется у позиции с журналом.
 *
 * Смена «метра» на «штуку» переписывает смысл всех прошлых движений разом:
 * 43,5 метра трубы становятся 43,5 штуками, и подсказка раздела «правка
 * названия и порога не трогает движений» перестаёт быть правдой. Нужна другая
 * единица — заводится другая позиция, а старая уходит в архив.
 *
 * Смотрим на движения, а не на остаток: нулевой остаток при десятке приходов
 * и расходов — это полный журнал, который так же нельзя переписывать.
 */
async function assertNoMovements(itemId: string): Promise<void> {
  const count = await db.stockMovement.count({ where: { itemId } });
  if (count > 0) {
    throw new ApiException(
      'validation_error',
      'По позиции уже есть движения: единицу измерения им не сменить. Заведите новую позицию с нужной единицей',
      'unit',
    );
  }
}

/** Позиция сдаётся в архив, а не удаляется: журнал её движений остаётся. */
export async function archiveItem(id: string): Promise<void> {
  const found = await db.stockItem.findUnique({ where: { id }, select: { archived: true } });
  if (found === null) throw new ApiException('not_found', 'Позиция не найдена', 'id');
  if (found.archived) return;

  await assertItemEmpty(id);
  await db.stockItem.update({ where: { id }, data: { archived: true } });
}

/**
 * 🔴 Архив не прячет вещи.
 *
 * Позиция, сданная в архив с остатком, исчезает из таблицы вместе с ним, и
 * вопрос «куда делись тридцать метров трассы» снова остаётся без ответа —
 * ровно тот, ради которого склад и завели. Хочется убрать позицию — сначала
 * спишите остаток инвентаризацией с основанием или переместите его.
 */
async function assertItemEmpty(itemId: string): Promise<void> {
  const zoneIds = await activeZoneIds();
  const balances = await balancesOf([itemId], zoneIds);
  const byZone = balances.get(itemId);
  const empty = byZone === undefined || [...byZone.values()].every((qty) => qty === 0);

  if (!empty) {
    throw new ApiException(
      'validation_error',
      'Остаток по позиции не нулевой: спишите его инвентаризацией или переместите, а потом сдавайте позицию в архив',
      'archived',
    );
  }
}

/** То же и про зону: архивная зона с остатком уносит его из итогов молча. */
async function assertZoneEmpty(zoneId: string): Promise<void> {
  const [incoming, outgoing] = await Promise.all([
    db.stockMovement.groupBy({ by: ['itemId'], where: { toZoneId: zoneId }, _sum: { qty: true } }),
    db.stockMovement.groupBy({
      by: ['itemId'],
      where: { fromZoneId: zoneId },
      _sum: { qty: true },
    }),
  ]);

  const totals = new Map<string, number>();
  for (const row of incoming) {
    totals.set(row.itemId, round3((totals.get(row.itemId) ?? 0) + decimalToNumber(row._sum.qty)));
  }
  for (const row of outgoing) {
    totals.set(row.itemId, round3((totals.get(row.itemId) ?? 0) - decimalToNumber(row._sum.qty)));
  }

  if ([...totals.values()].some((qty) => qty !== 0)) {
    throw new ApiException(
      'validation_error',
      'В зоне остаток не нулевой: переместите его в другую зону или спишите, а потом сдавайте зону в архив',
      'archived',
    );
  }
}

// ---------- Остатки: страница раздела ----------

/** Позиций на странице остатков — двадцать: это таблица, а не список карточек. */
export const STOCK_PAGE_SIZE = 20;

/**
 * Сколько страниц справочника отдаётся форме списания за раз. Потолок
 * унаследован от клиентской сборки, которую он заменил (issue #88): он там
 * существовал затем, чтобы разросшийся справочник не превратил открытие наряда
 * в двадцать запросов. Теперь запрос один, но ограничение осталось — уже ради
 * веса разметки.
 */
const MAX_DIRECTORY_PAGES = 10;

export type StockOverviewQuery = {
  readonly query?: string | undefined;
  readonly group?: string | undefined;
  readonly low?: boolean | undefined;
  /** Архив — отдельный вид списка, а не примесь к обычному. */
  readonly archived?: boolean | undefined;
  readonly page?: number | undefined;
};

function itemWhere(query: StockOverviewQuery): Prisma.StockItemWhereInput {
  const text = query.query?.trim() ?? '';
  const group = query.group?.trim() ?? '';

  return {
    /* Архив показывается вместо обычного списка, а не вместе с ним: смешать
       их значит показать позицию, которой больше не пользуются, там же, где
       выбирают, что взять на выезд. */
    archived: query.archived === true,
    ...(text === '' ? {} : { name: { contains: text, mode: 'insensitive' } }),
    ...(group === '' ? {} : { group }),
  };
}

/** Список групп собирается из самих позиций: зашить его в код значит запретить владельцу завести свою. */
async function groupsOf(): Promise<readonly string[]> {
  const rows = await db.stockItem.findMany({
    where: { archived: false, NOT: { group: null } },
    distinct: ['group'],
    select: { group: true },
    orderBy: { group: 'asc' },
  });

  return rows.flatMap((row) => (row.group === null ? [] : [row.group]));
}

/**
 * Позиции, опустившиеся ниже порога.
 *
 * Считается по всему справочнику, а не по текущему фильтру: «пора заказывать»
 * — это цифра склада, и она не должна меняться от того, что владелец что-то
 * набрал в поиске.
 */
async function lowItemIds(zoneIds: readonly string[]): Promise<readonly string[]> {
  const watched = await db.stockItem.findMany({
    where: { archived: false, minQty: { gt: 0 } },
    select: { id: true, minQty: true },
  });
  if (watched.length === 0) return [];

  const balances = await balancesOf(
    watched.map((item) => item.id),
    zoneIds,
  );

  return watched.flatMap((item) => {
    const byZone = balances.get(item.id);
    const total = round3([...(byZone?.values() ?? [])].reduce((sum, qty) => sum + qty, 0));

    return isLow(total, decimalToNumber(item.minQty)) ? [item.id] : [];
  });
}

/**
 * Остатки по зонам — строки позиции, колонки зоны (CRM.md §11.3).
 *
 * Разбивка честная: сначала считается число подходящих позиций, потом из базы
 * берётся окно страницы и только для него — остаток по зонам. Читать журнал
 * целиком нельзя: через год движений будут десятки тысяч.
 */
export async function overview(query: StockOverviewQuery, viewer: Viewer): Promise<StockOverview> {
  const visible = await zones(viewer);
  const zoneIds = visible.map((zone) => zone.id);
  const owner = viewer.role === 'owner';

  /* Порога у монтажника нет вовсе — значит, и считать его незачем. */
  const low = owner ? await lowItemIds(zoneIds) : [];

  const where: Prisma.StockItemWhereInput = {
    ...itemWhere(query),
    ...(owner && query.low === true ? { id: { in: [...low] } } : {}),
  };

  const total = await db.stockItem.count({ where });
  const window = pageWindow(total, query.page ?? 1, STOCK_PAGE_SIZE);

  const rows = await db.stockItem.findMany({
    where,
    select: itemSelect,
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    skip: window.skip,
    take: window.take,
  });

  const balances = await balancesOf(
    rows.map((row) => row.id),
    zoneIds,
  );

  const shared = {
    zones: visible,
    items: rows.map((row) => toItemCard(row, visible, balances, viewer.role)),
    groups: await groupsOf(),
    total,
    page: window.page,
    pages: window.pages,
  };

  return owner ? { ...shared, lowCount: low.length } : shared;
}

/**
 * 🔴 Справочник целиком — для формы списания на карточке наряда.
 *
 * Отдельно от `overview` и без страниц: форме нужен полный список позиций,
 * чтобы монтажник нашёл нужную, а не первые двадцать. Раньше клиент собирал
 * его сам — первая страница, затем до девяти параллельных запросов, — и
 * открытие наряда стоило одиннадцати походов по сети у того человека, у
 * которого сеть хуже всего (issue #88).
 *
 * Потолок остаётся: справочник на тысячу позиций не должен превращать
 * страницу наряда в мегабайт разметки. Он тот же, что был у клиента, — десять
 * страниц по двадцать.
 *
 * Ролевая проекция не меняется: `zones` и `toItemCard` сами решают, что видит
 * монтажник, и владельческие ключи (`minQty`, `low`) в его ответ не попадают
 * вовсе, а не приходят пустыми (ADR-134).
 */
export async function directory(viewer: Viewer): Promise<StockDirectory> {
  const visible = await zones(viewer);
  const zoneIds = visible.map((zone) => zone.id);

  const rows = await db.stockItem.findMany({
    select: itemSelect,
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    take: STOCK_PAGE_SIZE * MAX_DIRECTORY_PAGES,
  });

  const balances = await balancesOf(
    rows.map((row) => row.id),
    zoneIds,
  );

  return {
    zones: visible,
    items: rows.map((row) => toItemCard(row, visible, balances, viewer.role)),
  };
}

// ---------- Журнал движений ----------

const movementSelect = {
  id: true,
  kind: true,
  qty: true,
  item: { select: { id: true, name: true, unit: true } },
  fromZone: { select: { id: true, name: true } },
  toZone: { select: { id: true, name: true } },
  order: { select: { id: true, number: true } },
  serials: true,
  reason: true,
  author: { select: { name: true, login: true } },
  createdAt: true,
} as const;

type MovementRow = {
  id: string;
  kind: DbMoveKind;
  qty: Prisma.Decimal;
  item: { id: string; name: string; unit: DbUnit };
  fromZone: { id: string; name: string } | null;
  toZone: { id: string; name: string } | null;
  order: { id: string; number: number } | null;
  serials: string | null;
  reason: string | null;
  author: { name: string | null; login: string } | null;
  createdAt: Date;
};

function toMovementCard(row: MovementRow): StockMovementCard {
  return {
    id: row.id,
    kind: MOVE_KIND_FROM_DB[row.kind],
    qty: decimalToNumber(row.qty),
    item: { id: row.item.id, name: row.item.name, unit: UNIT_FROM_DB[row.item.unit] },
    fromZone: row.fromZone,
    toZone: row.toZone,
    order: row.order,
    serials: row.serials,
    reason: row.reason,
    authorName: row.author === null ? null : (row.author.name ?? row.author.login),
    createdAt: row.createdAt.toISOString(),
  };
}

export type StockMovementQuery = {
  readonly item?: string | undefined;
  /** Вид движения: «покажи только приходы» — обычный вопрос к журналу. */
  readonly kind?: StockMoveKind | undefined;
  readonly page?: number | undefined;
};

/**
 * Журнал движений. Сверху последнее: журнал читают, чтобы понять, что
 * произошло сегодня, а не с чего всё начиналось.
 */
export async function movements(query: StockMovementQuery): Promise<Page<StockMovementCard>> {
  const itemId = query.item?.trim() ?? '';
  const where: Prisma.StockMovementWhereInput = {
    ...(itemId === '' ? {} : { itemId }),
    ...(query.kind === undefined ? {} : { kind: MOVE_KIND_TO_DB[query.kind] }),
  };

  const total = await db.stockMovement.count({ where });
  const window = pageWindow(total, query.page ?? 1, STOCK_PAGE_SIZE);

  const rows = await db.stockMovement.findMany({
    where,
    select: movementSelect,
    orderBy: { createdAt: 'desc' },
    skip: window.skip,
    take: window.take,
  });

  return { items: rows.map(toMovementCard), total, page: window.page, pages: window.pages };
}

/**
 * Сколько движений показывает карточка позиции.
 *
 * Журнал позиции за годы работы не помещается в экран и не должен помещаться
 * в один ответ: карточка отвечает на вопрос «что было с этой позицией
 * недавно», а весь журнал живёт по `/api/admin/stock/movements?item=`.
 */
const ITEM_MOVEMENTS_LIMIT = 50;

export async function item(id: string, viewer: Viewer): Promise<StockItemDetails | null> {
  const row = await db.stockItem.findUnique({ where: { id }, select: itemSelect });
  if (row === null) return null;

  const rows = await db.stockMovement.findMany({
    where: { itemId: id },
    select: movementSelect,
    orderBy: { createdAt: 'desc' },
    take: ITEM_MOVEMENTS_LIMIT,
  });

  return { item: await itemCardOf(row, viewer), movements: rows.map(toMovementCard) };
}

// ---------- Проведение движения ----------

/** Строка журнала в том виде, в каком она уходит в базу. */
type MovementData = {
  readonly kind: DbMoveKind;
  readonly itemId: string;
  readonly qty: number;
  readonly fromZoneId: string | null;
  readonly toZoneId: string | null;
  readonly orderId: string | null;
  readonly serials: string | null;
  readonly reason: string | null;
};

/**
 * Пять видов движения разворачиваются в одну строку журнала.
 *
 * Направление задают зоны, а не знак количества: приход — это зона получателя,
 * расход — зона источника. Исключение одно — инвентаризация: она и добавляет, и
 * убавляет, поэтому знак у неё свой, а зона всегда та, где считали.
 */
function movementData(input: StockMovementCreate): MovementData {
  const base = { kind: MOVE_KIND_TO_DB[input.kind], itemId: input.itemId, qty: input.qty };

  if (input.kind === 'income') {
    return {
      ...base,
      fromZoneId: null,
      toZoneId: input.toZoneId,
      orderId: null,
      serials: input.serials,
      reason: input.reason,
    };
  }

  if (input.kind === 'transfer') {
    return {
      ...base,
      fromZoneId: input.fromZoneId,
      toZoneId: input.toZoneId,
      orderId: null,
      serials: null,
      reason: input.reason,
    };
  }

  if (input.kind === 'consume') {
    return {
      ...base,
      fromZoneId: input.fromZoneId,
      toZoneId: null,
      orderId: input.orderId,
      serials: input.serials,
      reason: null,
    };
  }

  if (input.kind === 'return') {
    return {
      ...base,
      fromZoneId: null,
      toZoneId: input.toZoneId,
      orderId: input.orderId,
      serials: null,
      reason: input.reason,
    };
  }

  return {
    ...base,
    fromZoneId: null,
    toZoneId: input.toZoneId,
    orderId: null,
    serials: null,
    reason: input.reason,
  };
}

/**
 * Позиция и зоны движения существуют и не в архиве.
 *
 * Архив — это «этим больше не пользуемся»: движение по нему вернуло бы вещи
 * туда, откуда их только что убрали, и остаток снова разошёлся бы с
 * реальностью.
 */
async function assertMovable(data: MovementData): Promise<void> {
  const found = await db.stockItem.findUnique({
    where: { id: data.itemId },
    select: { archived: true },
  });
  if (found === null) {
    throw new ApiException('validation_error', 'Такой позиции нет в справочнике', 'itemId');
  }
  if (found.archived) {
    throw new ApiException(
      'validation_error',
      'Позиция сдана в архив: движения по ней не проводятся. Верните её из архива и повторите',
      'itemId',
    );
  }

  await assertZoneMovable(data.fromZoneId, 'fromZoneId');
  await assertZoneMovable(data.toZoneId, 'toZoneId');

  if (data.orderId !== null) {
    const order = await db.order.findUnique({ where: { id: data.orderId }, select: { id: true } });
    if (order === null) {
      throw new ApiException('validation_error', 'Такого наряда нет в базе', 'orderId');
    }
  }
}

async function assertZoneMovable(zoneId: string | null, field: string): Promise<void> {
  if (zoneId === null) return;

  const zone = await db.stockZone.findUnique({ where: { id: zoneId }, select: { archived: true } });
  if (zone === null) throw new ApiException('validation_error', 'Такой зоны нет на складе', field);
  if (zone.archived) {
    throw new ApiException(
      'validation_error',
      'Зона сдана в архив: движения по ней не проводятся. Выберите другую зону',
      field,
    );
  }
}

/**
 * 🔴 Что монтажнику позволено провести.
 *
 * Проверка на сервере, а не скрытием кнопок: монтажник знает адреса панели —
 * он в ней работает (docs/API.md §14). Чужой наряд отвечает `404` через общую
 * проверку доступа к наряду: существование чужого наряда его не касается
 * (ADR-114), а чужая машина — `403`: зона на складе не тайна, тайна — право
 * трогать её содержимое.
 */
export async function assertMayMove(input: StockMovementCreate, viewer: Viewer): Promise<void> {
  if (viewer.role === 'owner') return;

  if (input.kind !== 'consume' && input.kind !== 'return') {
    throw new ApiException(
      'forbidden',
      'Приход, перемещение и инвентаризацию проводит владелец. Вам доступны списание в наряд и возврат',
    );
  }

  await requireAccess(input.orderId, viewer);

  if (input.kind === 'consume') {
    await assertOwnVan(input.fromZoneId, viewer, 'Списывать можно только из своей машины');
    return;
  }

  await assertOwnVan(input.toZoneId, viewer, 'Возвращать можно только в свою машину');
}

async function assertOwnVan(zoneId: string, viewer: Viewer, message: string): Promise<void> {
  const own = await db.stockZone.findFirst({
    where: { id: zoneId, kind: 'VAN', userId: viewer.userId, archived: false },
    select: { id: true },
  });

  if (own === null) throw new ApiException('forbidden', message);
}

/**
 * Проведение движения.
 *
 * 🔴 Право провести именно это движение проверяется отдельно
 * (`assertMayMove`): здесь только запись и порог заказа. Разделение
 * сознательное — списание по наряду приходит и с общего маршрута движений, и
 * из формы закрытия наряда, а правило у них одно.
 */
export async function move(
  input: StockMovementCreate,
  authorId: string,
): Promise<StockMovementCard> {
  const data = movementData(input);
  await assertMovable(data);

  const row = await db.stockMovement.create({
    data: { ...data, authorId },
    select: movementSelect,
  });

  await noticeLow([data]);

  return toMovementCard(row);
}

// ---------- Порог «пора заказывать» ----------

/**
 * 🔴 Уведомление срабатывает на переходе через порог, а не на каждом движении.
 *
 * Было `≥ minQty`, стало `< minQty` — ставим в очередь. Иначе в день монтажа,
 * когда трассу списывают тремя движениями подряд, владелец получил бы три
 * одинаковых сообщения и перестал бы их читать. `minQty = 0` — за позицией не
 * следим.
 *
 * Остаток «до» не перечитывается вторым запросом, а восстанавливается из
 * остатка «после» и того, что сделало само движение: между двумя запросами
 * успело бы пройти чужое списание, и переход был бы посчитан по чужой работе.
 */
async function noticeLow(moved: readonly MovementData[]): Promise<void> {
  try {
    const watched = await db.stockItem.findMany({
      where: { id: { in: moved.map((data) => data.itemId) }, minQty: { gt: 0 } },
      select: { id: true, name: true, group: true, unit: true, minQty: true },
    });
    if (watched.length === 0) return;

    const zoneIds = await activeZoneIds();
    const visible = new Set(zoneIds);
    const balances = await balancesOf(
      watched.map((row) => row.id),
      zoneIds,
    );

    for (const row of watched) {
      const byZone = balances.get(row.id);
      const after = round3([...(byZone?.values() ?? [])].reduce((sum, qty) => sum + qty, 0));

      /* Одна и та же позиция могла уйти в наряд двумя строками формы: переход
         считается по их сумме, а не по последней из них. */
      const delta = moved
        .filter((data) => data.itemId === row.id)
        .reduce((sum, data) => round3(sum + totalDelta(data, visible)), 0);
      const before = round3(after - delta);

      const minQty = decimalToNumber(row.minQty);
      if (!isLow(after, minQty) || isLow(before, minQty)) continue;

      await enqueueNotification({
        kind: 'stock-low',
        itemId: row.id,
        name: row.name,
        group: row.group,
        unit: UNIT_FROM_DB[row.unit],
        qty: after,
        minQty,
      });
    }
  } catch (error) {
    /* Движение уже записано, и отказ очереди не должен превращаться в ошибку
       проведения: монтажник повторил бы списание и списал бы дважды. Владелец
       увидит потерю в журнале доставки, а склад останется верным. */
    console.error('Не получилось поставить уведомление о запасе:', error);
  }
}

/**
 * Что движение сделало с общим остатком позиции: приход в видимую зону
 * плюсом, уход из неё минусом. Перемещение между двумя зонами склада не меняет
 * ничего — и уведомления не вызывает, что и правильно: вещи никуда не делись.
 */
function totalDelta(data: MovementData, zoneIds: ReadonlySet<string>): number {
  const incoming = data.toZoneId !== null && zoneIds.has(data.toZoneId) ? data.qty : 0;
  const outgoing = data.fromZoneId !== null && zoneIds.has(data.fromZoneId) ? data.qty : 0;

  return round3(incoming - outgoing);
}

// ---------- Расход наряда ----------

/**
 * Что списано на наряд.
 *
 * И списания, и возвраты: отменённое списание остаётся в журнале возвратом, а
 * не исчезает — история наряда не переписывается (ADR-134).
 */
export async function consumptionOf(orderId: string, viewer: Viewer): Promise<OrderConsumption> {
  await requireAccess(orderId, viewer);

  return listConsumption(orderId);
}

async function listConsumption(orderId: string): Promise<OrderConsumption> {
  const rows = await db.stockMovement.findMany({
    where: { orderId, kind: { in: ['CONSUME', 'RETURN'] } },
    select: movementSelect,
    orderBy: { createdAt: 'asc' },
  });

  return { items: rows.map(toMovementCard) };
}

/**
 * Списать израсходованное на наряде.
 *
 * 🔴 Монтажник списывает только по своему наряду и только из своей машины:
 * право на каждую строку проверяется до записи, и ни одна строка не проходит,
 * если хотя бы одна отклонена — половина списания хуже, чем отказ целиком.
 */
export async function consume(
  orderId: string,
  input: OrderConsume,
  viewer: Viewer,
): Promise<OrderConsumption> {
  await requireAccess(orderId, viewer);

  for (const line of input.lines) {
    if (viewer.role === 'owner') continue;
    await assertOwnVan(line.fromZoneId, viewer, 'Списывать можно только из своей машины');
  }

  const lines = input.lines.map((line) =>
    movementData({
      kind: 'consume',
      itemId: line.itemId,
      qty: line.qty,
      fromZoneId: line.fromZoneId,
      orderId,
      serials: line.serials,
    }),
  );

  for (const data of lines) await assertMovable(data);

  await db.$transaction(
    lines.map((data) => db.stockMovement.create({ data: { ...data, authorId: viewer.userId } })),
  );

  /* Порог считается один раз на всю форму: списали три позиции — один проход
     по ним, а не три прогона по всему складу. */
  await noticeLow(lines);

  return listConsumption(orderId);
}

/** Человеческое основание возврата: журнал читают глазами, а не по ссылкам. */
function cancelReason(moveId: string): string {
  return `Отмена ошибочного списания (движение ${moveId})`;
}

/**
 * Отмена ошибочного списания.
 *
 * 🔴 Возвратом в ту же зону, а не удалением движения: журнал не переписывается
 * — иначе вопрос «куда делись тридцать метров трассы» снова остаётся без
 * ответа. Повторная отмена одного и того же списания не проходит: возврат
 * ссылается на отменённое движение полем `cancelsId`, и уникальность этой
 * ссылки держит база. Проверка перед записью тут была бы обманом — между ней
 * и вставкой успевает пройти второй такой же запрос, и материал вернулся бы
 * на склад дважды.
 */
export async function cancelConsumption(
  orderId: string,
  moveId: string,
  viewer: Viewer,
): Promise<StockMovementCard> {
  const order = await requireAccess(orderId, viewer);

  const row = await db.stockMovement.findFirst({
    where: { id: moveId, orderId, kind: 'CONSUME' },
    select: { id: true, itemId: true, qty: true, fromZoneId: true, authorId: true },
  });
  if (row === null) throw new ApiException('not_found', 'Списание не найдено');

  if (viewer.role !== 'owner') {
    /* Монтажник отменяет только своё и только пока наряд открыт: возврат в
       закрытую работу — решение владельца, как и возврат самого наряда. */
    if (row.authorId !== viewer.userId) {
      throw new ApiException('forbidden', 'Отменить списание может тот, кто его провёл');
    }
    if (order.status === 'DONE' || order.status === 'CANCELLED') {
      throw new ApiException(
        'forbidden',
        'Наряд закрыт: отмену списания по нему проводит владелец',
      );
    }
  }

  const already = await db.stockMovement.findFirst({
    where: { orderId, kind: 'RETURN', cancelsId: moveId },
    select: { id: true },
  });
  if (already !== null) {
    throw new ApiException('validation_error', 'Это списание уже отменено возвратом');
  }

  if (row.fromZoneId === null) {
    throw new ApiException(
      'validation_error',
      'У списания не указана зона: вернуть материал некуда. Проведите приход вручную',
    );
  }

  const data: MovementData = {
    kind: 'RETURN',
    itemId: row.itemId,
    qty: decimalToNumber(row.qty),
    fromZoneId: null,
    toZoneId: row.fromZoneId,
    orderId,
    serials: null,
    reason: cancelReason(moveId),
  };

  await assertMovable(data);

  /* Гонку двух отмен ловит уникальность `cancelsId`: проверка выше отвечает
     внятным текстом в обычном случае, база — в редком одновременном. */
  const created = await db.stockMovement
    .create({
      data: { ...data, cancelsId: moveId, authorId: viewer.userId },
      select: movementSelect,
    })
    .catch((error: unknown) => {
      /* 🔴 «Уже отменено» говорит только нарушение уникальности `cancelsId`.
         Всё остальное — обрыв соединения, таймаут, чужое ограничение —
         пробрасывается как есть: монтажник, которому на сбой базы ответили
         «возврат уже был», ищет несуществующий возврат в журнале и повторяет
         списание. Так же поступает `slug-retry.ts` рядом. */
      const duplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!duplicate) throw error;

      throw new ApiException('validation_error', 'Это списание уже отменено возвратом');
    });

  return toMovementCard(created);
}
