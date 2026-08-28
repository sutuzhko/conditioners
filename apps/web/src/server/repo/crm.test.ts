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
}));

vi.mock('@/server/db', () => ({
  db: {
    crmEvent: { findMany: mocks.eventFindMany, count: mocks.eventCount },
    order: { findMany: mocks.findMany },
  },
}));

import { countOverdue, listOrdersRange, listRange } from '@/server/repo/crm';

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
