// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены, и проверка доступа уходит в `cookies()` вне
   запроса. Без этой строки падают все проверки файла. */
vi.mock('@/server/repo/admin-users', () => ({}));

/* Подменяется база, а не репозиторий нарядов: 🔴 проекция полей под роль —
   то самое, что проверяют эти тесты, и подмена репозитория проверяла бы
   фикстуру вместо разграничения доступа. */
const fake = vi.hoisted(() => ({
  db: {
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    client: { findUnique: vi.fn() },
    adminUser: { findUnique: vi.fn() },
    setting: { findUnique: vi.fn(), upsert: vi.fn() },
    orderUnit: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({ db: fake.db }));

import { getAdminSession } from '@/server/auth';

import { GET, POST } from './route';
import { DELETE, GET as GET_ONE, PATCH } from './[id]/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const unitRow = {
  id: 'unit1',
  equip: 'CONDITIONER',
  model: 'Сплит-система 09',
  source: 'OURS',
  trassaM: 4,
  diameter: '1/4–3/8',
  shtrob: true,
  sort: 0,
};

/** Наряд, назначенный на `u2`, — тот самый монтажник из сессии. */
const orderRow = {
  id: 'o1',
  number: 1059,
  type: 'INSTALL',
  status: 'ASSIGNED',
  client: { id: 'c1', name: 'Ирина Соколова', phone: '+7 (910) 155-24-68' },
  installer: { id: 'u2', name: 'Дмитрий Соколов', login: 'sokolov', employment: 'SELF_EMPLOYED' },
  at: new Date('2026-08-28T08:00:00.000Z'),
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '24К',
  phone2: null,
  floor: 5,
  heightWorks: true,
  payment: 'COMPANY',
  price: 38500,
  installerFee: 9000,
  deductionSum: 500,
  deductionReason: 'Разбил кронштейн',
  comment: 'Домофон не работает, звонить на телефон',
  ownerNote: 'Клиент постоянный, скидку не даём',
  leadId: null,
  units: [unitRow],
  createdAt: new Date('2026-08-26T14:00:00.000Z'),
};

const createBody = {
  type: 'install',
  clientId: 'c1',
  installerId: 'u2',
  day: '2026-08-28',
  time: '11:00',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '',
  phone2: '',
  floor: 5,
  heightWorks: true,
  payment: 'company',
  price: 38500,
  installerFee: 9000,
  deductionSum: 0,
  deductionReason: '',
  comment: '',
  ownerNote: '',
  leadId: '',
  units: [
    {
      equip: 'conditioner',
      model: 'Сплит-система 09',
      source: 'ours',
      trassaM: 4,
      diameter: '1/4–3/8',
      shtrob: true,
    },
  ],
};

function request(url: string, init: { method?: string; body?: unknown } = {}): NextRequest {
  const { method = 'GET', body: payload } = init;

  return new NextRequest(new URL(url, 'https://tulaklimat.ru'), {
    method,
    ...(payload === undefined
      ? {}
      : { body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } }),
  });
}

const context = { params: Promise.resolve({ id: 'o1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);

  fake.db.$transaction.mockImplementation(async (run: (tx: typeof fake.db) => Promise<unknown>) =>
    run(fake.db),
  );
  fake.db.order.count.mockResolvedValue(1);
  fake.db.order.findMany.mockResolvedValue([orderRow]);
  fake.db.order.findFirst.mockResolvedValue(orderRow);
  fake.db.order.findUnique.mockResolvedValue({
    installerId: 'u2',
    status: 'ASSIGNED',
    deductionSum: 0,
    deductionReason: null,
  });
  fake.db.order.create.mockResolvedValue(orderRow);
  fake.db.order.update.mockResolvedValue(orderRow);
  fake.db.order.deleteMany.mockResolvedValue({ count: 1 });
  fake.db.client.findUnique.mockResolvedValue({ id: 'c1' });
  fake.db.adminUser.findUnique.mockResolvedValue({ id: 'u2' });
  fake.db.setting.findUnique.mockResolvedValue({ key: 'orderSeq', value: 1059 });
  fake.db.setting.upsert.mockResolvedValue({ key: 'orderSeq', value: 1060 });
  fake.db.orderUnit.deleteMany.mockResolvedValue({ count: 0 });
  fake.db.orderUnit.createMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('список нарядов', () => {
  it('без сессии список не отдаётся: это адреса, телефоны и деньги', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(request('/api/admin/orders'), undefined);

    expect(response.status).toBe(401);
    expect(fake.db.order.findMany).not.toHaveBeenCalled();
  });

  it('🔴 монтажник видит только свои наряды: отбор идёт запросом, а не разметкой', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await GET(request('/api/admin/orders'), undefined);

    expect(fake.db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ installerId: 'u2' }) }),
    );
  });

  it('владельцу список не сужается по исполнителю', async () => {
    await GET(request('/api/admin/orders'), undefined);

    const [args] = fake.db.order.findMany.mock.calls[0] ?? [];
    expect(args?.where).not.toHaveProperty('installerId');
  });

  it('без вкладки открываются активные наряды', async () => {
    await GET(request('/api/admin/orders'), undefined);

    expect(fake.db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }),
        orderBy: { at: 'asc' },
      }),
    );
  });

  it('история читается свежими сверху: там смотрят на то, что закончилось последним', async () => {
    await GET(request('/api/admin/orders?tab=history'), undefined);

    expect(fake.db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['DONE'] } }),
        orderBy: { at: 'desc' },
      }),
    );
  });

  it('незнакомая вкладка — это умолчание, а не отказ: адрес правят руками', async () => {
    await GET(request('/api/admin/orders?tab=нет&period=нет'), undefined);

    const [args] = fake.db.order.findMany.mock.calls[0] ?? [];
    expect(args?.where).toMatchObject({ status: { in: ['ASSIGNED', 'IN_PROGRESS'] } });
    expect(args?.where).not.toHaveProperty('at');
  });

  it('прошлый месяц считается в поясе работ, а не в UTC контейнера', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));

    await GET(request('/api/admin/orders?tab=all&period=prev'), undefined);

    expect(fake.db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          at: {
            gte: new Date('2026-06-30T21:00:00.000Z'),
            lt: new Date('2026-07-31T21:00:00.000Z'),
          },
        }),
      }),
    );
  });

  it('поиск по номеру наряда ищет номер, а не строку', async () => {
    await GET(request('/api/admin/orders?q=%E2%84%96%201059'), undefined);

    const [args] = fake.db.order.findMany.mock.calls[0] ?? [];
    expect(args?.where?.OR).toContainEqual({ number: 1059 });
  });

  it('поиск по адресу не притягивает наряд с таким же номером', async () => {
    await GET(request('/api/admin/orders?q=Первомайская'), undefined);

    const [args] = fake.db.order.findMany.mock.calls[0] ?? [];
    expect(args?.where?.OR).toEqual([
      { client: { name: { contains: 'Первомайская', mode: 'insensitive' } } },
      { address: { contains: 'Первомайская', mode: 'insensitive' } },
      { units: { some: { model: { contains: 'Первомайская', mode: 'insensitive' } } } },
    ]);
  });
});

describe('карточка наряда', () => {
  it('🔴 чужой наряд монтажнику — 404, а не 403: его существование монтажника не касается', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findFirst.mockResolvedValue(null);

    const response = await GET_ONE(request('/api/admin/orders/o1'), context);

    expect(response.status).toBe(404);
    expect(fake.db.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1', installerId: 'u2' } }),
    );
  });

  it('🔴 монтажнику не кладут заметку владельца и удержание — ключей нет вовсе', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_ONE(request('/api/admin/orders/o1'), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty('ownerNote');
    expect(body).not.toHaveProperty('deductionSum');
    expect(body).not.toHaveProperty('deductionReason');
    /* Комментарий монтажнику предназначен — он остаётся. */
    expect(body).toHaveProperty('comment', orderRow.comment);
  });

  it('🔴 при оплате компании суммы заказа монтажник не видит, свою выплату — видит', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const body = await (await GET_ONE(request('/api/admin/orders/o1'), context)).json();

    expect(body).not.toHaveProperty('price');
    expect(body).toHaveProperty('installerFee', 9000);
  });

  it('🔴 при оплате наличными сумма приходит: её нужно принять от клиента', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findFirst.mockResolvedValue({ ...orderRow, payment: 'CASH_TO_INSTALLER' });

    const body = await (await GET_ONE(request('/api/admin/orders/o1'), context)).json();

    expect(body).toMatchObject({ payment: 'cash_to_installer', price: 38500 });
  });

  it('владельцу наряд приходит целиком', async () => {
    const body = await (await GET_ONE(request('/api/admin/orders/o1'), context)).json();

    expect(body).toMatchObject({
      number: 1059,
      type: 'install',
      status: 'assigned',
      price: 38500,
      deductionSum: 500,
      deductionReason: 'Разбил кронштейн',
      ownerNote: 'Клиент постоянный, скидку не даём',
      installer: { id: 'u2', employment: 'self_employed' },
      units: [{ equip: 'conditioner', source: 'ours', shtrob: true }],
    });
  });
});

describe('создание наряда', () => {
  it('🔴 монтажник наряды не заводит', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await POST(
      request('/api/admin/orders', { method: 'POST', body: createBody }),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(fake.db.order.create).not.toHaveBeenCalled();
  });

  it('владелец заводит наряд и получает 201', async () => {
    const response = await POST(
      request('/api/admin/orders', { method: 'POST', body: createBody }),
      undefined,
    );

    expect(response.status).toBe(201);
  });

  it('🔴 номер выдаёт счётчик, а не база: нумерация идёт без дыр', async () => {
    await POST(request('/api/admin/orders', { method: 'POST', body: createBody }), undefined);

    expect(fake.db.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ number: 1060 }) }),
    );
    expect(fake.db.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'orderSeq' }, update: { value: 1060 } }),
    );
  });

  it('первый наряд получает № 1: выдуманная тысяча сообщала бы о работах, которых не было', async () => {
    fake.db.setting.findUnique.mockResolvedValue(null);

    await POST(request('/api/admin/orders', { method: 'POST', body: createBody }), undefined);

    expect(fake.db.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ number: 1 }) }),
    );
  });

  it('заведённый сразу на человека наряд назначен, а не «новый»', async () => {
    await POST(request('/api/admin/orders', { method: 'POST', body: createBody }), undefined);

    expect(fake.db.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ASSIGNED' }) }),
    );
  });

  it('без исполнителя наряд остаётся новым', async () => {
    await POST(
      request('/api/admin/orders', { method: 'POST', body: { ...createBody, installerId: '' } }),
      undefined,
    );

    expect(fake.db.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'NEW' }) }),
    );
  });

  it('несуществующий клиент — понятная ошибка поля, а не 500 от базы', async () => {
    fake.db.client.findUnique.mockResolvedValue(null);

    const response = await POST(
      request('/api/admin/orders', { method: 'POST', body: createBody }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { field: 'clientId' } });
    expect(fake.db.order.create).not.toHaveBeenCalled();
  });

  it('🔴 удержание без основания не сохраняется', async () => {
    const response = await POST(
      request('/api/admin/orders', {
        method: 'POST',
        body: { ...createBody, deductionSum: 500, deductionReason: '' },
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { field: 'deductionReason' } });
    expect(fake.db.order.create).not.toHaveBeenCalled();
  });
});

describe('правка наряда', () => {
  it('🔴 дату переносят только вместе со временем', async () => {
    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { day: '2026-09-01' } }),
      context,
    );

    expect(response.status).toBe(400);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('перенос собирает момент времени из даты и времени в поясе работ', async () => {
    await PATCH(
      request('/api/admin/orders/o1', {
        method: 'PATCH',
        body: { day: '2026-09-01', time: '11:00' },
      }),
      context,
    );

    expect(fake.db.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ at: new Date('2026-09-01T08:00:00.000Z') }),
      }),
    );
  });

  it('🔴 удержание без основания не проходит и правкой', async () => {
    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { deductionSum: 500 } }),
      context,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { field: 'deductionReason' } });
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('🔴 основание не снимают с сохранённой суммы — это досматривается на записи целиком', async () => {
    fake.db.order.findUnique.mockResolvedValue({
      status: 'ASSIGNED',
      deductionSum: 500,
      deductionReason: 'Разбил кронштейн',
    });

    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { deductionReason: '' } }),
      context,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { field: 'deductionReason' } });
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('позиции заменяются целиком: дописывать по одной нечем', async () => {
    await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { units: createBody.units } }),
      context,
    );

    expect(fake.db.orderUnit.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'o1' } });
    expect(fake.db.orderUnit.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: 'o1',
          equip: 'CONDITIONER',
          model: 'Сплит-система 09',
          source: 'OURS',
          trassaM: 4,
          diameter: '1/4–3/8',
          shtrob: true,
          sort: 0,
        },
      ],
    });
  });

  it('🔴 монтажник не может отказаться от наряда', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { status: 'cancelled' } }),
      context,
    );

    expect(response.status).toBe(400);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('🔴 и цену себе тоже не поднимет: схема монтажника знает одно поле', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(
      request('/api/admin/orders/o1', {
        method: 'PATCH',
        body: { status: 'done', installerFee: 99000 },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('свой наряд монтажник переводит в работу', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { status: 'in_progress' } }),
      context,
    );

    expect(response.status).toBe(200);
    expect(fake.db.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'IN_PROGRESS' } }),
    );
  });

  it('🔴 чужой наряд монтажник не двигает — и снова 404, а не 403', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findUnique.mockResolvedValue({ installerId: 'u9', status: 'ASSIGNED' });

    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { status: 'done' } }),
      context,
    );

    expect(response.status).toBe(404);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('🔴 закрытый наряд монтажник не переоткрывает: возврат в работу — решение владельца', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findUnique.mockResolvedValue({ installerId: 'u2', status: 'DONE' });

    const response = await PATCH(
      request('/api/admin/orders/o1', { method: 'PATCH', body: { status: 'in_progress' } }),
      context,
    );

    expect(response.status).toBe(403);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });
});

describe('удаление наряда', () => {
  it('🔴 монтажнику удаление закрыто', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await DELETE(request('/api/admin/orders/o1', { method: 'DELETE' }), context);

    expect(response.status).toBe(403);
    expect(fake.db.order.deleteMany).not.toHaveBeenCalled();
  });

  it('владелец удаляет наряд и получает 204', async () => {
    const response = await DELETE(request('/api/admin/orders/o1', { method: 'DELETE' }), context);

    expect(response.status).toBe(204);
    expect(fake.db.order.deleteMany).toHaveBeenCalledWith({ where: { id: 'o1' } });
  });
});
