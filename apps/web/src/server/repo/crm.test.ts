// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Мок захватывается через `vi.hoisted`, а не берётся у типизированного
   клиента: наряд выбирается с `select` и со связями, а тип модели Prisma
   требует все поля таблицы — заготовка из двадцати полей ради двух проверок
   ничего не объясняла бы. */
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  eventFindMany: vi.fn(),
  eventCount: vi.fn(),
  leadFindMany: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  db: {
    crmEvent: { findMany: mocks.eventFindMany, count: mocks.eventCount },
    order: { findMany: mocks.findMany },
    lead: { findMany: mocks.leadFindMany },
  },
}));

import { countOverdue, listOrdersRange, listRange, search } from '@/server/repo/crm';

type FindManyArgs = {
  readonly where?: Record<string, unknown>;
  readonly select?: Record<string, unknown>;
};

/** С чем ушёл запрос: разграничение по роли живёт в его условии, а не после. */
function askedWith(): FindManyArgs {
  const [args] = mocks.findMany.mock.calls[0] ?? [];
  return args ?? {};
}

const row = {
  id: 'o1',
  number: 1059,
  type: 'INSTALL',
  status: 'ASSIGNED',
  at: new Date('2026-08-23T07:00:00.000Z'),
  durationMin: 180,
  address: 'Тула, Первомайская, 12',
  client: { name: 'Ирина Соколова' },
  installerId: 'u2',
  installer: { name: 'Дмитрий Соколов', login: 'dmitry' },
};

const from = new Date('2026-08-23T21:00:00.000Z');
const to = new Date('2026-08-24T21:00:00.000Z');

const OWNER = { role: 'owner', userId: 'u1' } as const;
const INSTALLER = { role: 'installer', userId: 'u2' } as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([row]);
  mocks.eventFindMany.mockResolvedValue([]);
  mocks.eventCount.mockResolvedValue(3);
});

describe('наряды в календаре', () => {
  it('🔴 монтажнику отбор идёт условием запроса, а не фильтром после выборки', async () => {
    await listOrdersRange({ role: 'installer', userId: 'u2' }, from, to);

    expect(askedWith().where).toMatchObject({ installerId: 'u2' });
  });

  it('владелец видит наряды всей команды', async () => {
    await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    expect(askedWith().where).not.toHaveProperty('installerId');
  });

  it('отказы в сетку не попадают: отменённый выезд никого не занимает', async () => {
    await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    expect(askedWith().where).toMatchObject({ status: { not: 'CANCELLED' } });
  });

  it('🔴 денег в выборке нет вовсе: календарь их не показывает и не получает', async () => {
    await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    const fields = Object.keys(askedWith().select ?? {});

    for (const closed of [
      'price',
      'installerFee',
      'deductionSum',
      'deductionReason',
      'ownerNote',
    ]) {
      expect(fields).not.toContain(closed);
    }
  });

  it('переводит наряд в контракт: типы и статусы строчными', async () => {
    const [order] = await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    expect(order).toMatchObject({
      number: 1059,
      type: 'install',
      status: 'assigned',
      at: '2026-08-23T07:00:00.000Z',
      clientName: 'Ирина Соколова',
      installerName: 'Дмитрий Соколов',
    });
  });

  it('без имени подписывает исполнителя логином: колонка без подписи бесполезна', async () => {
    mocks.findMany.mockResolvedValue([{ ...row, installer: { name: null, login: 'dmitry' } }]);

    const [order] = await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    expect(order?.installerName).toBe('dmitry');
  });

  it('наряд без исполнителя остаётся без подписи, а не выдумывает её', async () => {
    mocks.findMany.mockResolvedValue([{ ...row, installerId: null, installer: null }]);

    const [order] = await listOrdersRange({ role: 'owner', userId: 'u1' }, from, to);

    expect(order?.installerId).toBeNull();
    expect(order?.installerName).toBeNull();
  });
});

describe('дела в календаре', () => {
  it('🔴 монтажнику дел не отдаётся вовсе — и запрос за ними не уходит', async () => {
    await expect(listRange(INSTALLER, from, to)).resolves.toEqual([]);

    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it('владелец получает дела промежутка как раньше', async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        kind: 'CALL',
        status: 'PLANNED',
        at: new Date('2026-08-24T07:00:00.000Z'),
        durationMin: 30,
        overtimeMin: 0,
        clientName: 'Ирина Соколова',
        clientPhone: '+7 (910) 155-24-68',
        address: 'Тула, Первомайская, 12',
        note: 'перезвонить после обеда',
        leadId: null,
      },
    ]);

    const events = await listRange(OWNER, from, to);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'e1', kind: 'call', clientName: 'Ирина Соколова' });
    expect(mocks.eventFindMany.mock.calls[0]?.[0]?.where).toMatchObject({
      at: { gte: from, lt: to },
    });
  });

  it('🔴 просрочка чужих дел монтажнику не считается: у него их нет', async () => {
    await expect(countOverdue(INSTALLER, from)).resolves.toBe(0);

    expect(mocks.eventCount).not.toHaveBeenCalled();
  });

  it('владельцу просрочка считается по-прежнему', async () => {
    await expect(countOverdue(OWNER, from)).resolves.toBe(3);

    expect(mocks.eventCount).toHaveBeenCalled();
  });
});

/**
 * Поиск по календарю — issue #126–#129.
 *
 * 🔴 Проверяется здесь не «нашлось ли», а **что ушло в запрос**: разграничение
 * по роли живёт в условии, а не в фильтре после выборки. Чужая запись не
 * должна покидать базу даже для того, чтобы быть отброшенной (ADR-114).
 */
describe('поиск по календарю', () => {
  beforeEach(() => {
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);
    mocks.leadFindMany.mockResolvedValue([]);
  });

  it('🔴 монтажник ищет только среди своих нарядов, а дел и заявок не касается', async () => {
    await search(INSTALLER, 'Первомайская');

    expect(mocks.eventFindMany).not.toHaveBeenCalled();
    expect(mocks.leadFindMany).not.toHaveBeenCalled();

    const where = mocks.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where).toMatchObject({ installerId: INSTALLER.userId });
  });

  it('владелец ищет по всем трём видам записей', async () => {
    await search(OWNER, 'Первомайская');

    expect(mocks.eventFindMany).toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalled();
    expect(mocks.leadFindMany).toHaveBeenCalled();

    const where = mocks.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where).not.toHaveProperty('installerId');
  });

  it('🔴 поиск не ограничен видимым периодом: в условии нет ни одной границы по дате', async () => {
    await search(OWNER, 'Соколова');

    for (const call of [mocks.eventFindMany, mocks.findMany, mocks.leadFindMany]) {
      const where = JSON.stringify(call.mock.calls[0]?.[0]?.where ?? {});
      expect(where).not.toContain('"at"');
      expect(where).not.toContain('createdAt');
    }
  });

  it('пустой запрос до базы не доходит', async () => {
    await expect(search(OWNER, '   ')).resolves.toEqual([]);

    expect(mocks.eventFindMany).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.leadFindMany).not.toHaveBeenCalled();
  });

  it('находки складываются в один список, свежие первыми', async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: 'e1',
        kind: 'CALL',
        status: 'PLANNED',
        at: new Date('2026-08-20T09:00:00Z'),
        durationMin: 60,
        overtimeMin: 0,
        clientName: 'Ирина Соколова',
        clientPhone: null,
        address: 'Тула, Первомайская, 12',
        note: null,
        leadId: null,
      },
    ]);
    mocks.findMany.mockResolvedValue([
      {
        id: 'o1',
        number: 1059,
        type: 'INSTALL',
        status: 'NEW',
        at: new Date('2026-09-01T07:00:00Z'),
        durationMin: 120,
        address: 'Тула, Первомайская, 12',
        client: { name: 'Пётр Соколов' },
        installerId: null,
        installer: null,
      },
    ]);
    mocks.leadFindMany.mockResolvedValue([
      {
        id: 'l1',
        name: 'Ирина Соколова',
        phone: '+7 (910) 155-24-68',
        topic: 'install',
        address: 'Тула, Первомайская, 12',
        comment: null,
        createdAt: new Date('2026-08-15T10:00:00Z'),
      },
    ]);

    const found = await search(OWNER, 'Соколов');

    expect(found.map((hit) => hit.kind)).toEqual(['order', 'event', 'lead']);
    expect(found[0]).toMatchObject({ kind: 'order', number: 1059 });
    expect(found[1]).toMatchObject({ kind: 'event', clientName: 'Ирина Соколова' });
    expect(found[2]).toMatchObject({ kind: 'lead', topic: 'install' });
  });
});
