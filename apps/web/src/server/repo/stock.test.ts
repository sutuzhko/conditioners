// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@prisma/client';

import type { StockItemCard, StockMovementCreate } from '@/entities/stock/model';

/**
 * База подменена целиком, но не заглушкой: движения складываются в маленький
 * журнал, а `groupBy` считает по нему ровно то же, что посчитал бы Postgres.
 * Проверяются решения склада — как считается остаток, что видно монтажнику и
 * когда владельцу уходит «пора заказывать», — а не работа Prisma.
 */
type GroupArgs = {
  readonly by: readonly string[];
  readonly where?: {
    readonly itemId?: { readonly in?: readonly string[] };
    readonly toZoneId?: string | { readonly in?: readonly string[] };
    readonly fromZoneId?: string | { readonly in?: readonly string[] };
  };
};

type ZoneArgs = {
  readonly where?: {
    readonly id?: string;
    readonly archived?: boolean;
    readonly kind?: string;
    readonly userId?: string;
  };
};

type ItemArgs = {
  readonly where?: {
    readonly id?: string | { readonly in?: readonly string[] };
    readonly archived?: boolean;
    readonly group?: string;
    readonly name?: { readonly contains?: string };
    readonly minQty?: { readonly gt?: number };
    readonly NOT?: unknown;
  };
  readonly select?: Readonly<Record<string, unknown>>;
  readonly skip?: number;
  readonly take?: number;
};

type MovementArgs = { readonly data?: Readonly<Record<string, unknown>> };

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    stockZone: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    order: { findUnique: vi.fn() },
    adminUser: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));

/* 🔴 Разрыв цикла импортов: `http` тянет `auth`, тот — `repo/admin-users`, а
   он обратно `http`. На полпути круга `ApiException` оказывается пустой. */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/notifications/queue', () => ({ enqueueNotification: vi.fn() }));

/* Доступ к наряду — общее правило нарядов, и проверяется оно своими тестами.
   Здесь важно только, что склад его спрашивает. */
vi.mock('@/server/repo/orders', () => ({ requireAccess: vi.fn() }));

import { enqueueNotification } from '@/server/notifications/queue';
import { requireAccess } from '@/server/repo/orders';

const {
  archiveZone,
  assertMayMove,
  cancelConsumption,
  consume,
  consumptionOf,
  move,
  overview,
  updateItem,
  updateZone,
  zones,
} = await import('./stock');

// ---------- Маленькая база ----------

type Decimalish = { toNumber: () => number };

function dec(value: number): Decimalish {
  return { toNumber: () => value };
}

type ZoneFixture = {
  id: string;
  kind: 'WAREHOUSE' | 'VAN';
  name: string;
  userId: string | null;
  user: { name: string | null; login: string } | null;
  sort: number;
  archived: boolean;
};

type ItemFixture = {
  id: string;
  name: string;
  group: string | null;
  unit: 'METER' | 'PAIR';
  minQty: Decimalish;
  note: string | null;
  archived: boolean;
  product: null;
};

type Ledger = {
  id: string;
  itemId: string;
  kind: string;
  qty: number;
  fromZoneId: string | null;
  toZoneId: string | null;
  orderId: string | null;
  serials: string | null;
  reason: string | null;
  authorId: string | null;
};

const GARAGE: ZoneFixture = {
  id: 'z1',
  kind: 'WAREHOUSE',
  name: 'Гараж',
  userId: null,
  user: null,
  sort: 0,
  archived: false,
};

const VAN: ZoneFixture = {
  id: 'z2',
  kind: 'VAN',
  name: 'Газель',
  userId: 'u2',
  user: { name: 'Дмитрий Соколов', login: 'sokolov' },
  sort: 1,
  archived: false,
};

const OTHER_VAN: ZoneFixture = {
  id: 'z3',
  kind: 'VAN',
  name: 'Ларгус',
  userId: 'u3',
  user: { name: null, login: 'petrov' },
  sort: 2,
  archived: false,
};

const TUBE: ItemFixture = {
  id: 's1',
  name: 'Труба медная 1/4″',
  group: 'Медная труба',
  unit: 'METER',
  minQty: dec(30),
  note: null,
  archived: false,
  product: null,
};

const BRACKET: ItemFixture = {
  id: 's2',
  name: 'Кронштейн 415×450',
  group: 'Крепёж',
  unit: 'PAIR',
  minQty: dec(0),
  note: null,
  archived: false,
  product: null,
};

let zoneRows: ZoneFixture[] = [];
let itemRows: ItemFixture[] = [];
let ledger: Ledger[] = [];
let nextId = 0;

const owner = { role: 'owner', userId: 'u1' } as const;
const installer = { role: 'installer', userId: 'u2' } as const;

function zoneOf(id: string | null): { id: string; name: string } | null {
  const found = zoneRows.find((zone) => zone.id === id);
  return found === undefined ? null : { id: found.id, name: found.name };
}

function movementRow(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const row: Ledger = {
    id: `m${(nextId += 1)}`,
    itemId: String(data.itemId),
    kind: String(data.kind),
    qty: Number(data.qty),
    fromZoneId:
      data.fromZoneId === null || data.fromZoneId === undefined ? null : String(data.fromZoneId),
    toZoneId: data.toZoneId === null || data.toZoneId === undefined ? null : String(data.toZoneId),
    orderId: data.orderId === null || data.orderId === undefined ? null : String(data.orderId),
    serials: data.serials === null || data.serials === undefined ? null : String(data.serials),
    reason: data.reason === null || data.reason === undefined ? null : String(data.reason),
    authorId: data.authorId === null || data.authorId === undefined ? null : String(data.authorId),
  };
  ledger.push(row);

  const item = itemRows.find((candidate) => candidate.id === row.itemId) ?? TUBE;

  return {
    ...row,
    qty: dec(row.qty),
    item: { id: item.id, name: item.name, unit: item.unit },
    fromZone: zoneOf(row.fromZoneId),
    toZone: zoneOf(row.toZoneId),
    order: row.orderId === null ? null : { id: row.orderId, number: 1059 },
    author: { name: 'Дмитрий Соколов', login: 'sokolov' },
    createdAt: new Date('2026-08-27T09:12:00.000Z'),
  };
}

/** `groupBy` считается по журналу так же, как считал бы Postgres. */
function groupBy(args: GroupArgs): unknown[] {
  const where = args.where ?? {};
  const field =
    args.by.includes('toZoneId') || where.toZoneId !== undefined ? 'toZoneId' : 'fromZoneId';
  const zoneFilter = where[field];
  const zoneIds = typeof zoneFilter === 'string' ? [zoneFilter] : (zoneFilter?.in ?? undefined);
  const itemIds = where.itemId?.in;

  const sums = new Map<string, number>();
  for (const row of ledger) {
    const zoneId = row[field];
    if (zoneId === null) continue;
    if (itemIds !== undefined && !itemIds.includes(row.itemId)) continue;
    if (zoneIds !== undefined && !zoneIds.includes(zoneId)) continue;

    const key = args.by.includes(field) ? `${row.itemId}|${zoneId}` : `${row.itemId}|`;
    sums.set(key, (sums.get(key) ?? 0) + row.qty);
  }

  return [...sums.entries()].map(([key, qty]) => {
    const [itemId, zoneId] = key.split('|');
    return { itemId, [field]: zoneId === '' ? null : zoneId, _sum: { qty: dec(qty) } };
  });
}

function matchesItem(item: ItemFixture, args: ItemArgs): boolean {
  const where = args.where ?? {};
  const id = where.id;

  if (typeof id === 'string' && item.id !== id) return false;
  if (typeof id === 'object' && id.in !== undefined && !id.in.includes(item.id)) return false;
  if (where.archived !== undefined && item.archived !== where.archived) return false;
  if (where.group !== undefined && item.group !== where.group) return false;
  if (where.minQty?.gt !== undefined && item.minQty.toNumber() <= where.minQty.gt) return false;
  if (where.NOT !== undefined && item.group === null) return false;

  const contains = where.name?.contains;
  return contains === undefined || item.name.toLowerCase().includes(contains.toLowerCase());
}

function findItems(args: ItemArgs): unknown[] {
  const found = itemRows.filter((item) => matchesItem(item, args));
  const select = args.select ?? {};

  if (select.group !== undefined && select.id === undefined) {
    const groups = [...new Set(found.flatMap((item) => (item.group === null ? [] : [item.group])))];
    return groups.sort().map((group) => ({ group }));
  }

  const window = found.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? found.length));
  return window;
}

beforeEach(() => {
  vi.clearAllMocks();
  zoneRows = [{ ...GARAGE }, { ...VAN }, { ...OTHER_VAN }];
  itemRows = [{ ...TUBE }, { ...BRACKET }];
  ledger = [];
  nextId = 0;

  dbMock.stockZone.findMany.mockImplementation((args: ZoneArgs) => {
    const where = args.where ?? {};
    return Promise.resolve(
      zoneRows.filter(
        (zone) =>
          (where.archived === undefined || zone.archived === where.archived) &&
          (where.kind === undefined || zone.kind === where.kind) &&
          (where.userId === undefined || zone.userId === where.userId),
      ),
    );
  });
  dbMock.stockZone.findUnique.mockImplementation((args: ZoneArgs) =>
    Promise.resolve(zoneRows.find((zone) => zone.id === args.where?.id) ?? null),
  );
  dbMock.stockZone.findFirst.mockImplementation((args: ZoneArgs) => {
    const where = args.where ?? {};
    return Promise.resolve(
      zoneRows.find(
        (zone) =>
          zone.id === where.id &&
          (where.kind === undefined || zone.kind === where.kind) &&
          (where.userId === undefined || zone.userId === where.userId) &&
          (where.archived === undefined || zone.archived === where.archived),
      ) ?? null,
    );
  });
  dbMock.stockZone.update.mockResolvedValue({ ...GARAGE });

  dbMock.stockItem.findMany.mockImplementation((args: ItemArgs) =>
    Promise.resolve(findItems(args)),
  );
  dbMock.stockItem.findUnique.mockImplementation((args: ItemArgs) =>
    Promise.resolve(itemRows.find((item) => item.id === args.where?.id) ?? null),
  );
  dbMock.stockItem.count.mockImplementation((args: ItemArgs) =>
    Promise.resolve(itemRows.filter((item) => matchesItem(item, args)).length),
  );

  dbMock.stockMovement.groupBy.mockImplementation((args: GroupArgs) =>
    Promise.resolve(groupBy(args)),
  );
  dbMock.stockMovement.create.mockImplementation((args: MovementArgs) =>
    Promise.resolve(movementRow(args.data ?? {})),
  );
  dbMock.stockMovement.findMany.mockImplementation(() =>
    Promise.resolve(ledger.map((row) => movementRow({ ...row, kind: row.kind }))),
  );
  dbMock.stockMovement.findFirst.mockResolvedValue(null);
  dbMock.stockMovement.count.mockResolvedValue(0);
  dbMock.$transaction.mockImplementation((operations: readonly Promise<unknown>[]) =>
    Promise.all(operations),
  );

  dbMock.order.findUnique.mockResolvedValue({ id: 'o1' });
  dbMock.adminUser.findUnique.mockResolvedValue({ id: 'u2' });
  vi.mocked(requireAccess).mockResolvedValue({ id: 'o1', installerId: 'u2', status: 'ASSIGNED' });
});

/** Приход, перемещение и списание — прямо в журнал, без разбора маршрутом. */
function ledgerLine(patch: Partial<Ledger>): void {
  ledger.push({
    id: `seed${ledger.length}`,
    itemId: 's1',
    kind: 'INCOME',
    qty: 0,
    fromZoneId: null,
    toZoneId: null,
    orderId: null,
    serials: null,
    reason: null,
    authorId: 'u1',
    ...patch,
  });
}

function cardOf(items: readonly StockItemCard[], id: string): StockItemCard {
  const found = items.find((item) => item.id === id);
  if (found === undefined) throw new Error(`Позиции ${id} нет в ответе`);
  return found;
}

// ---------- Остатки ----------

describe('Остатки по зонам', () => {
  it('🔴 остаток — сумма движений: приход в зону минус расход из неё', async () => {
    ledgerLine({ kind: 'INCOME', qty: 50, toZoneId: 'z1' });
    ledgerLine({ kind: 'TRANSFER', qty: 15, fromZoneId: 'z1', toZoneId: 'z2' });
    ledgerLine({ kind: 'CONSUME', qty: 4, fromZoneId: 'z2' });

    const page = await overview({}, owner);
    const tube = cardOf(page.items, 's1');

    expect(tube.byZone).toEqual({ z1: 35, z2: 11, z3: 0 });
    expect(tube.total).toBe(46);
  });

  it('инвентаризация — поправка со знаком в зоне, где считали', async () => {
    ledgerLine({ kind: 'INCOME', qty: 50, toZoneId: 'z1' });
    ledgerLine({ kind: 'COUNT', qty: -7.5, toZoneId: 'z1', reason: 'Пересчёт после сезона' });

    const page = await overview({}, owner);

    expect(cardOf(page.items, 's1').total).toBe(42.5);
  });

  it('🔴 нулевая колонка есть в ответе: это «здесь ничего нет», а не отсутствие данных', async () => {
    const page = await overview({}, owner);

    expect(cardOf(page.items, 's1').byZone).toEqual({ z1: 0, z2: 0, z3: 0 });
  });

  it('🔴 уход в минус отдаётся как есть: это сигнал, а не отказ', async () => {
    ledgerLine({ kind: 'CONSUME', qty: 6, fromZoneId: 'z2' });

    const page = await overview({}, owner);

    expect(cardOf(page.items, 's1').byZone.z2).toBe(-6);
  });

  it('владельцу приходят порог, отметка «ниже порога» и общий счётчик', async () => {
    ledgerLine({ kind: 'INCOME', qty: 12, toZoneId: 'z1' });

    const page = await overview({}, owner);
    const tube = cardOf(page.items, 's1');

    expect(tube.minQty).toBe(30);
    expect(tube.low).toBe(true);
    expect(page.lowCount).toBe(1);
  });

  it('позиция без порога ниже него не опускается', async () => {
    const page = await overview({}, owner);

    expect(cardOf(page.items, 's2').low).toBe(false);
    expect(page.lowCount).toBe(1);
  });

  it('🔴 монтажник видит только свою машину — и отбор идёт в запросе', async () => {
    ledgerLine({ kind: 'INCOME', qty: 50, toZoneId: 'z1' });
    ledgerLine({ kind: 'TRANSFER', qty: 15, fromZoneId: 'z1', toZoneId: 'z2' });

    const page = await overview({}, installer);
    const tube = cardOf(page.items, 's1');

    expect(page.zones.map((zone) => zone.id)).toEqual(['z2']);
    // итог монтажника — остаток его машины, а не компании
    expect(tube.byZone).toEqual({ z2: 15 });
    expect(tube.total).toBe(15);
    expect(dbMock.stockZone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archived: false, kind: 'VAN', userId: 'u2' } }),
    );
  });

  it('🔴 у монтажника нет ключей про порог — их нет вовсе, а не пустыми', async () => {
    const page = await overview({}, installer);
    const tube = cardOf(page.items, 's1');

    expect('minQty' in tube).toBe(false);
    expect('low' in tube).toBe(false);
    expect('lowCount' in page).toBe(false);
  });

  it('фильтр «только ниже порога» оставляет в выдаче именно их', async () => {
    ledgerLine({ kind: 'INCOME', qty: 12, toZoneId: 'z1' });

    const page = await overview({ low: true }, owner);

    expect(page.items.map((row) => row.id)).toEqual(['s1']);
    expect(page.total).toBe(1);
  });

  it('поиск и группа сужают выборку, список групп приходит целиком', async () => {
    const page = await overview({ query: 'кронштейн' }, owner);

    expect(page.items.map((row) => row.id)).toEqual(['s2']);
    expect(page.groups).toEqual(['Крепёж', 'Медная труба']);
  });

  it('зоны приходят с хозяином машины: логин остаётся запасной подписью', async () => {
    const list = await zones(owner);

    expect(list.map((zone) => zone.userName)).toEqual([null, 'Дмитрий Соколов', 'petrov']);
  });
});

// ---------- Проведение движения ----------

const income: StockMovementCreate = {
  kind: 'income',
  itemId: 's1',
  qty: 50,
  toZoneId: 'z1',
  serials: null,
  reason: null,
};

describe('Проведение движения', () => {
  it('приход пишется в зону получателя', async () => {
    const card = await move(income, 'u1');

    expect(card.kind).toBe('income');
    expect(card.qty).toBe(50);
    expect(card.toZone).toEqual({ id: 'z1', name: 'Гараж' });
    expect(card.fromZone).toBeNull();
  });

  it('🔴 списание в минус проводится: запрет заставил бы монтажника вписать неправду', async () => {
    const card = await move(
      { kind: 'consume', itemId: 's1', qty: 4, fromZoneId: 'z2', orderId: 'o1', serials: null },
      'u2',
    );

    expect(card.kind).toBe('consume');
    const page = await overview({}, owner);
    expect(cardOf(page.items, 's1').byZone.z2).toBe(-4);
  });

  it('🔴 архивная позиция движений не принимает', async () => {
    itemRows = [{ ...TUBE, archived: true }, { ...BRACKET }];

    await expect(move(income, 'u1')).rejects.toThrow(/архив/i);
  });

  it('🔴 архивная зона движений не принимает', async () => {
    zoneRows = [{ ...GARAGE, archived: true }, { ...VAN }];

    await expect(move(income, 'u1')).rejects.toThrow(/архив/i);
  });

  it('несуществующая позиция — понятная ошибка ввода, а не сбой', async () => {
    await expect(move({ ...income, itemId: 'нет' }, 'u1')).rejects.toThrow(/справочник/i);
  });
});

// ---------- Право провести движение ----------

describe('Что позволено монтажнику', () => {
  it('владельцу открыты все виды движения', async () => {
    await expect(assertMayMove(income, owner)).resolves.toBeUndefined();
  });

  it('🔴 приход, перемещение и инвентаризацию монтажник не проводит', async () => {
    await expect(assertMayMove(income, installer)).rejects.toThrow(/владелец/i);
  });

  it('🔴 списать можно только из своей машины', async () => {
    const foreign: StockMovementCreate = {
      kind: 'consume',
      itemId: 's1',
      qty: 4,
      fromZoneId: 'z3',
      orderId: 'o1',
      serials: null,
    };

    await expect(assertMayMove(foreign, installer)).rejects.toThrow(/своей машины/i);
  });

  it('🔴 и только по своему наряду: чужой наряд отвечает «не найден»', async () => {
    vi.mocked(requireAccess).mockRejectedValue(new Error('Наряд не найден'));

    const own: StockMovementCreate = {
      kind: 'consume',
      itemId: 's1',
      qty: 4,
      fromZoneId: 'z2',
      orderId: 'o9',
      serials: null,
    };

    await expect(assertMayMove(own, installer)).rejects.toThrow(/не найден/i);
  });

  it('своё списание из своей машины проходит', async () => {
    const own: StockMovementCreate = {
      kind: 'consume',
      itemId: 's1',
      qty: 4,
      fromZoneId: 'z2',
      orderId: 'o1',
      serials: null,
    };

    await expect(assertMayMove(own, installer)).resolves.toBeUndefined();
  });
});

// ---------- Порог «пора заказывать» ----------

describe('Пора заказывать', () => {
  it('🔴 уведомление уходит на переходе через порог, а не на каждом движении', async () => {
    ledgerLine({ kind: 'INCOME', qty: 34, toZoneId: 'z1' });

    await move(
      { kind: 'consume', itemId: 's1', qty: 5, fromZoneId: 'z1', orderId: 'o1', serials: null },
      'u1',
    );

    expect(enqueueNotification).toHaveBeenCalledTimes(1);
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'stock-low', itemId: 's1', qty: 29, minQty: 30 }),
    );
  });

  it('🔴 второе списание ниже порога сообщение не повторяет', async () => {
    ledgerLine({ kind: 'INCOME', qty: 34, toZoneId: 'z1' });

    const line: StockMovementCreate = {
      kind: 'consume',
      itemId: 's1',
      qty: 5,
      fromZoneId: 'z1',
      orderId: 'o1',
      serials: null,
    };

    await move(line, 'u1');
    await move(line, 'u1');

    expect(enqueueNotification).toHaveBeenCalledTimes(1);
  });

  it('порог ноль — за позицией не следим', async () => {
    await move(
      { kind: 'consume', itemId: 's2', qty: 5, fromZoneId: 'z1', orderId: 'o1', serials: null },
      'u1',
    );

    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('перемещение между зонами склада порога не трогает: вещи никуда не делись', async () => {
    ledgerLine({ kind: 'INCOME', qty: 20, toZoneId: 'z1' });

    await move(
      { kind: 'transfer', itemId: 's1', qty: 15, fromZoneId: 'z1', toZoneId: 'z2', reason: null },
      'u1',
    );

    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('отказ очереди не отменяет уже записанное движение', async () => {
    ledgerLine({ kind: 'INCOME', qty: 34, toZoneId: 'z1' });
    vi.mocked(enqueueNotification).mockRejectedValue(new Error('канал молчит'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const card = await move(
      { kind: 'consume', itemId: 's1', qty: 5, fromZoneId: 'z1', orderId: 'o1', serials: null },
      'u1',
    );

    expect(card.qty).toBe(5);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

// ---------- Правка справочника ----------

describe('🔴 правка позиции пишет только присланное', () => {
  beforeEach(() => {
    dbMock.stockItem.update.mockResolvedValue({ ...TUBE });
  });

  it('переименование не трогает ни порог заказа, ни архив', async () => {
    await updateItem('s1', { name: 'Труба медная 3/8″' }, owner);

    expect(dbMock.stockItem.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { name: 'Труба медная 3/8″' },
      select: expect.anything(),
    });
  });

  it('присланное пустым очищает поле — это другое действие, и оно доходит', async () => {
    await updateItem('s1', { group: null, note: null }, owner);

    expect(dbMock.stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { group: null, note: null } }),
    );
  });

  it('🔴 единицу измерения не сменить, пока по позиции есть движения', async () => {
    dbMock.stockMovement.count.mockResolvedValue(3);

    await expect(updateItem('s1', { unit: 'piece' }, owner)).rejects.toThrow(/движения/i);
    expect(dbMock.stockItem.update).not.toHaveBeenCalled();
  });

  it('позиция без единого движения единицу сменить может', async () => {
    dbMock.stockMovement.count.mockResolvedValue(0);

    await updateItem('s1', { unit: 'piece' }, owner);

    expect(dbMock.stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { unit: 'PIECE' } }),
    );
  });

  it('та же единица, что и была, движений не касается', async () => {
    dbMock.stockMovement.count.mockResolvedValue(9);

    await updateItem('s1', { unit: 'meter', name: 'Труба' }, owner);

    expect(dbMock.stockItem.update).toHaveBeenCalled();
  });
});

describe('🔴 правка зоны пишет только присланное', () => {
  it('переименование не обнуляет порядок колонок и не поднимает из архива', async () => {
    await updateZone('z1', { name: 'Гараж на Мира' });

    expect(dbMock.stockZone.update).toHaveBeenCalledWith({
      where: { id: 'z1' },
      data: { name: 'Гараж на Мира' },
      select: expect.anything(),
    });
  });

  it('🔴 склад не станет машиной, пока у него не появится хозяин', async () => {
    await expect(updateZone('z1', { kind: 'van' })).rejects.toThrow(/чья это машина/i);
    expect(dbMock.stockZone.update).not.toHaveBeenCalled();
  });

  it('🔴 хозяина складу не приписать: пару досматривает итоговое состояние', async () => {
    await expect(updateZone('z1', { userId: 'u2' })).rejects.toThrow(/не принадлежит/i);
  });

  it('машина остаётся машиной, когда меняют только название', async () => {
    await updateZone('z2', { name: 'Газель белая' });

    expect(dbMock.stockZone.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Газель белая' } }),
    );
  });
});

// ---------- Расход наряда ----------

describe('Расход наряда', () => {
  const lines = {
    lines: [
      { itemId: 's1', qty: 4, fromZoneId: 'z2', serials: null },
      { itemId: 's2', qty: 1, fromZoneId: 'z2', serials: null },
    ],
  };

  it('списание идёт одной формой и возвращает весь расход наряда', async () => {
    const result = await consume('o1', lines, installer);

    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(requireAccess).toHaveBeenCalledWith('o1', installer);
  });

  it('🔴 чужая машина в строке отменяет всю форму: половина списания хуже отказа', async () => {
    const foreign = { lines: [{ itemId: 's1', qty: 4, fromZoneId: 'z3', serials: null }] };

    await expect(consume('o1', foreign, installer)).rejects.toThrow(/своей машины/i);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('расход наряда спрашивает доступ к наряду, а не отдаёт его всякому', async () => {
    ledgerLine({ kind: 'CONSUME', qty: 4, fromZoneId: 'z2', orderId: 'o1' });

    const result = await consumptionOf('o1', installer);

    expect(requireAccess).toHaveBeenCalledWith('o1', installer);
    expect(result.items).toHaveLength(1);
  });

  it('🔴 отмена — возврат в ту же зону, а не удаление движения', async () => {
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u2' }
          : null,
      ),
    );

    const card = await cancelConsumption('o1', 'm7', installer);

    expect(dbMock.stockMovement.delete).not.toHaveBeenCalled();
    expect(card.kind).toBe('return');
    expect(card.toZone).toEqual({ id: 'z2', name: 'Газель' });
    expect(card.reason).toContain('m7');

    /* Ссылка на отменённое списание уникальна в базе: она, а не текст
       основания, не даёт вернуть один и тот же материал дважды. */
    expect(dbMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cancelsId: 'm7' }) }),
    );
  });

  it('🔴 отменить дважды не выйдет: возврат ссылается на отменённое движение', async () => {
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u2' }
          : { id: 'm8' },
      ),
    );

    await expect(cancelConsumption('o1', 'm7', installer)).rejects.toThrow(/уже отменено/i);
  });

  it('🔴 сбой базы не выдаётся за «уже отменено»', async () => {
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u2' }
          : null,
      ),
    );
    /* Обрыв соединения, таймаут, чужое ограничение — что угодно, кроме
       нарушения уникальности `cancelsId`. Ответ «возврат уже был» отправляет
       монтажника искать несуществующую запись в журнале. */
    dbMock.stockMovement.create.mockRejectedValue(new Error('соединение потеряно'));

    await expect(cancelConsumption('o1', 'm7', installer)).rejects.toThrow(/соединение потеряно/i);
  });

  it('нарушение уникальности `cancelsId` — и только оно — значит «уже отменено»', async () => {
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u2' }
          : null,
      ),
    );
    dbMock.stockMovement.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(cancelConsumption('o1', 'm7', installer)).rejects.toThrow(/уже отменено/i);
  });

  it('🔴 чужое списание монтажник не отменяет', async () => {
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u3' }
          : null,
      ),
    );

    await expect(cancelConsumption('o1', 'm7', installer)).rejects.toThrow(/провёл/i);
  });

  it('🔴 закрытый наряд монтажник не правит: возврат в работу — решение владельца', async () => {
    vi.mocked(requireAccess).mockResolvedValue({ id: 'o1', installerId: 'u2', status: 'DONE' });
    dbMock.stockMovement.findFirst.mockImplementation((args: { where?: { kind?: string } }) =>
      Promise.resolve(
        args.where?.kind === 'CONSUME'
          ? { id: 'm7', itemId: 's1', qty: dec(4), fromZoneId: 'z2', authorId: 'u2' }
          : null,
      ),
    );

    await expect(cancelConsumption('o1', 'm7', installer)).rejects.toThrow(/закрыт/i);
  });
});

// ---------- Архив ----------

describe('Архив не прячет вещи', () => {
  it('🔴 зона с остатком в архив не уходит: он исчез бы из итогов молча', async () => {
    ledgerLine({ kind: 'INCOME', qty: 10, toZoneId: 'z1' });

    await expect(archiveZone('z1')).rejects.toThrow(/не нулевой/i);
    expect(dbMock.stockZone.update).not.toHaveBeenCalled();
  });

  it('пустая зона сдаётся в архив', async () => {
    await archiveZone('z1');

    expect(dbMock.stockZone.update).toHaveBeenCalledWith({
      where: { id: 'z1' },
      data: { archived: true },
    });
  });
});
