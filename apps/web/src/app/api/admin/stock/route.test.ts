// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http`, а `http` — обратно `auth`.
   Без этой строки падают все проверки файла. */
vi.mock('@/server/repo/admin-users', () => ({}));

/* Схема тела списания живёт в доменном контракте и не подменяется: маршрут
   обязан отвергать пустую форму сам, а не полагаться на то, что репозиторий
   разберётся. */
vi.mock('@/server/repo/stock', () => ({
  overview: vi.fn(),
  zones: vi.fn(),
  createZone: vi.fn(),
  updateZone: vi.fn(),
  archiveZone: vi.fn(),
  item: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  archiveItem: vi.fn(),
  movements: vi.fn(),
  move: vi.fn(),
  assertMayMove: vi.fn(),
  consume: vi.fn(),
  consumptionOf: vi.fn(),
  cancelConsumption: vi.fn(),
}));

import * as stock from '@/server/repo/stock';
import { getAdminSession } from '@/server/auth';
import { ApiException } from '@/server/http';

import { GET } from './route';
import { POST as CREATE_ITEM } from './items/route';
import { DELETE as ARCHIVE_ITEM, GET as GET_ITEM, PATCH as PATCH_ITEM } from './items/[id]/route';
import { GET as GET_ZONES, POST as CREATE_ZONE } from './zones/route';
import { DELETE as ARCHIVE_ZONE, PATCH as PATCH_ZONE } from './zones/[id]/route';
import { GET as GET_MOVEMENTS, POST as MOVE } from './movements/route';
import { GET as GET_CONSUMPTION, POST as CONSUME } from '../orders/[id]/consumption/route';
import { DELETE as CANCEL_CONSUMPTION } from '../orders/[id]/consumption/[move]/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const zone = {
  id: 'z1',
  kind: 'warehouse',
  name: 'Гараж',
  userId: null,
  userName: null,
  sort: 0,
  archived: false,
} as const;

const card = {
  id: 's1',
  name: 'Труба медная 1/4″',
  group: 'Медная труба',
  unit: 'meter',
  note: null,
  archived: false,
  product: null,
  byZone: { z1: 43.5 },
  total: 43.5,
  minQty: 30,
  low: false,
} as const;

const movement = {
  id: 'm1',
  kind: 'consume',
  qty: 4,
  item: { id: 's1', name: 'Труба медная 1/4″', unit: 'meter' },
  fromZone: { id: 'z2', name: 'Газель' },
  toZone: null,
  order: { id: 'o1', number: 1059 },
  serials: null,
  reason: null,
  authorName: 'Дмитрий Соколов',
  createdAt: '2026-08-27T09:12:00.000Z',
} as const;

const page = {
  zones: [zone],
  items: [card],
  groups: ['Медная труба'],
  total: 1,
  page: 1,
  pages: 1,
  size: 20,
  itemsTotal: 1,
  lowCount: 0,
  nearCount: 0,
};

const itemBody = {
  name: 'Труба медная 1/4″',
  group: 'Медная труба',
  unit: 'meter',
  minQty: '30',
  productId: '',
  note: '',
};

const zoneBody = { kind: 'van', name: 'Газель', userId: 'u2', sort: 1 };

function request(url: string, init: { method?: string; body?: unknown } = {}): NextRequest {
  const { method = 'GET', body: payload } = init;

  return new NextRequest(new URL(url, 'https://tulaklimat.ru'), {
    method,
    ...(payload === undefined
      ? {}
      : { body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } }),
  });
}

const itemContext = { params: Promise.resolve({ id: 's1' }) };
const zoneContext = { params: Promise.resolve({ id: 'z1' }) };
const orderContext = { params: Promise.resolve({ id: 'o1' }) };
const moveContext = { params: Promise.resolve({ id: 'o1', move: 'm1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(stock.overview).mockResolvedValue(page);
  vi.mocked(stock.zones).mockResolvedValue([zone]);
  vi.mocked(stock.createZone).mockResolvedValue(zone);
  vi.mocked(stock.updateZone).mockResolvedValue(zone);
  vi.mocked(stock.archiveZone).mockResolvedValue(undefined);
  vi.mocked(stock.item).mockResolvedValue({ item: card, movements: [movement] });
  vi.mocked(stock.createItem).mockResolvedValue(card);
  vi.mocked(stock.updateItem).mockResolvedValue(card);
  vi.mocked(stock.archiveItem).mockResolvedValue(undefined);
  vi.mocked(stock.movements).mockResolvedValue({ items: [movement], total: 1, page: 1, pages: 1 });
  vi.mocked(stock.move).mockResolvedValue(movement);
  vi.mocked(stock.assertMayMove).mockResolvedValue(undefined);
  vi.mocked(stock.consume).mockResolvedValue({ items: [movement] });
  vi.mocked(stock.consumptionOf).mockResolvedValue({ items: [movement] });
  vi.mocked(stock.cancelConsumption).mockResolvedValue(movement);
});

describe('Остатки', () => {
  it('без сессии склад не отдаётся', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(request('/api/admin/stock'), undefined);

    expect(response.status).toBe(401);
    expect(stock.overview).not.toHaveBeenCalled();
  });

  it('🔴 монтажнику раздел открыт: наряд он закрывает тем, что у него с собой', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET(request('/api/admin/stock'), undefined);

    expect(response.status).toBe(200);
    expect(stock.overview).toHaveBeenCalledWith(expect.anything(), {
      role: 'installer',
      userId: 'u2',
    });
  });

  it('поиск, группа, отметка «ниже порога» и страница берутся из адреса', async () => {
    await GET(request('/api/admin/stock?q=труба&group=Крепёж&low=1&page=3'), undefined);

    expect(stock.overview).toHaveBeenCalledWith(
      { query: 'труба', group: 'Крепёж', low: true, archived: false, page: 3 },
      { role: 'owner', userId: 'u1' },
    );
  });

  it('🔴 шаг листания берётся из адреса, а не зашит в репозитории (issue #608)', async () => {
    await GET(request('/api/admin/stock?size=8'), undefined);

    expect(stock.overview).toHaveBeenCalledWith(
      expect.objectContaining({ size: 8 }),
      expect.anything(),
    );
  });

  it('мусор в шаге листания даёт умолчание раздела, а не отказ', async () => {
    await GET(request('/api/admin/stock?size=много'), undefined);

    expect(stock.overview).toHaveBeenCalledWith(
      expect.objectContaining({ size: undefined }),
      expect.anything(),
    );
  });

  it('🔴 архив — отдельный вид списка: без него сданную позицию нечем вернуть', async () => {
    await GET(request('/api/admin/stock?archived=1'), undefined);

    expect(stock.overview).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
      expect.anything(),
    );
  });

  it('мусор в отметке и в номере страницы — это «показывай всё» и первая страница', async () => {
    await GET(request('/api/admin/stock?low=нет&page=нет'), undefined);

    expect(stock.overview).toHaveBeenCalledWith(
      expect.objectContaining({ low: false, page: 1 }),
      expect.anything(),
    );
  });
});

describe('Справочник позиций', () => {
  it('🔴 позиции заводит владелец: монтажнику маршрут закрыт', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await CREATE_ITEM(
      request('/api/admin/stock/items', { method: 'POST', body: itemBody }),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(stock.createItem).not.toHaveBeenCalled();
  });

  it('новая позиция — 201, пустые поля приходят как «не заполнено»', async () => {
    const response = await CREATE_ITEM(
      request('/api/admin/stock/items', { method: 'POST', body: itemBody }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(stock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ minQty: 30, productId: null, note: null }),
      { role: 'owner', userId: 'u1' },
    );
  });

  it('позиция без названия не заводится', async () => {
    const response = await CREATE_ITEM(
      request('/api/admin/stock/items', { method: 'POST', body: { ...itemBody, name: ' ' } }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(stock.createItem).not.toHaveBeenCalled();
  });

  it('🔴 карточка позиции — владельческая: в ней порог и весь журнал', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_ITEM(request('/api/admin/stock/items/s1'), itemContext);

    expect(response.status).toBe(403);
    expect(stock.item).not.toHaveBeenCalled();
  });

  it('неизвестная позиция — 404', async () => {
    vi.mocked(stock.item).mockResolvedValue(null);

    const response = await GET_ITEM(request('/api/admin/stock/items/s9'), itemContext);

    expect(response.status).toBe(404);
  });

  it('правка позиции идёт целиком, вместе с отметкой архива', async () => {
    const response = await PATCH_ITEM(
      request('/api/admin/stock/items/s1', {
        method: 'PATCH',
        body: { ...itemBody, archived: true },
      }),
      itemContext,
    );

    expect(response.status).toBe(200);
    expect(stock.updateItem).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ archived: true }),
      { role: 'owner', userId: 'u1' },
    );
  });

  it('удаление — это архивирование, и отвечает 204', async () => {
    const response = await ARCHIVE_ITEM(
      request('/api/admin/stock/items/s1', { method: 'DELETE' }),
      itemContext,
    );

    expect(response.status).toBe(204);
    expect(stock.archiveItem).toHaveBeenCalledWith('s1');
  });
});

describe('Зоны хранения', () => {
  it('список открыт обеим ролям: отбор делает репозиторий', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_ZONES(request('/api/admin/stock/zones'), undefined);

    expect(response.status).toBe(200);
    expect(stock.zones).toHaveBeenCalledWith(
      { role: 'installer', userId: 'u2' },
      { archived: false },
    );
  });

  it('🔴 архивные зоны приходят только по прямой просьбе', async () => {
    await GET_ZONES(request('/api/admin/stock/zones?archived=1'), undefined);

    expect(stock.zones).toHaveBeenCalledWith(expect.anything(), { archived: true });
  });

  it('🔴 заводит и правит зоны только владелец', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const created = await CREATE_ZONE(
      request('/api/admin/stock/zones', { method: 'POST', body: zoneBody }),
      undefined,
    );
    const patched = await PATCH_ZONE(
      request('/api/admin/stock/zones/z1', { method: 'PATCH', body: zoneBody }),
      zoneContext,
    );

    expect(created.status).toBe(403);
    expect(patched.status).toBe(403);
    expect(stock.createZone).not.toHaveBeenCalled();
  });

  it('машина без хозяина не заводится: монтажник видит свою по этой связи', async () => {
    const response = await CREATE_ZONE(
      request('/api/admin/stock/zones', { method: 'POST', body: { ...zoneBody, userId: '' } }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(stock.createZone).not.toHaveBeenCalled();
  });

  it('новая зона — 201, архивирование — 204', async () => {
    const created = await CREATE_ZONE(
      request('/api/admin/stock/zones', { method: 'POST', body: zoneBody }),
      undefined,
    );
    const archived = await ARCHIVE_ZONE(
      request('/api/admin/stock/zones/z1', { method: 'DELETE' }),
      zoneContext,
    );

    expect(created.status).toBe(201);
    expect(archived.status).toBe(204);
    expect(stock.archiveZone).toHaveBeenCalledWith('z1');
  });
});

describe('Движения', () => {
  const body = { kind: 'income', itemId: 's1', qty: '12,5', toZoneId: 'z1' };

  it('🔴 право провести движение проверяется до записи', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    vi.mocked(stock.assertMayMove).mockRejectedValue(
      new ApiException('forbidden', 'Приход проводит владелец'),
    );

    const response = await MOVE(
      request('/api/admin/stock/movements', { method: 'POST', body }),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(stock.move).not.toHaveBeenCalled();
  });

  it('количество принимается по-русски: «12,5» — это 12,5', async () => {
    const response = await MOVE(
      request('/api/admin/stock/movements', { method: 'POST', body }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(stock.move).toHaveBeenCalledWith(expect.objectContaining({ qty: 12.5 }), 'u1');
    expect(await response.json()).toMatchObject({ movement: { id: 'm1' } });
  });

  it('🔴 инвентаризация без основания не проводится', async () => {
    const response = await MOVE(
      request('/api/admin/stock/movements', {
        method: 'POST',
        body: { kind: 'count', itemId: 's1', qty: '-3', toZoneId: 'z1', reason: '' },
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(stock.move).not.toHaveBeenCalled();
  });

  it('🔴 журнал целиком — владельческий', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_MOVEMENTS(request('/api/admin/stock/movements'), undefined);

    expect(response.status).toBe(403);
    expect(stock.movements).not.toHaveBeenCalled();
  });

  it('журнал фильтруется по позиции и листается', async () => {
    await GET_MOVEMENTS(request('/api/admin/stock/movements?item=s1&page=2'), undefined);

    expect(stock.movements).toHaveBeenCalledWith(expect.objectContaining({ item: 's1', page: 2 }));
  });

  it('🔴 период и поиск журнала берутся из адреса (issue #610)', async () => {
    await GET_MOVEMENTS(request('/api/admin/stock/movements?period=month&q=накладная'), undefined);

    expect(stock.movements).toHaveBeenCalledWith(
      expect.objectContaining({ period: 'month', query: 'накладная' }),
    );
  });

  it('неизвестный период — «за всё время», а не отказ: адрес правят руками', async () => {
    await GET_MOVEMENTS(request('/api/admin/stock/movements?period=год'), undefined);

    expect(stock.movements).toHaveBeenCalledWith(expect.objectContaining({ period: undefined }));
  });
});

describe('Расход наряда', () => {
  const body = { lines: [{ itemId: 's1', qty: '4', fromZoneId: 'z2' }] };

  it('расход своего наряда монтажнику открыт', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_CONSUMPTION(
      request('/api/admin/orders/o1/consumption'),
      orderContext,
    );

    expect(response.status).toBe(200);
    expect(stock.consumptionOf).toHaveBeenCalledWith('o1', { role: 'installer', userId: 'u2' });
  });

  it('списание — 201 и весь расход наряда в ответе', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await CONSUME(
      request('/api/admin/orders/o1/consumption', { method: 'POST', body }),
      orderContext,
    );

    expect(response.status).toBe(201);
    expect(stock.consume).toHaveBeenCalledWith(
      'o1',
      { lines: [{ itemId: 's1', qty: 4, fromZoneId: 'z2', serials: null }] },
      { role: 'installer', userId: 'u2' },
    );
    expect(await response.json()).toMatchObject({ items: [{ id: 'm1' }] });
  });

  it('пустая форма списания отклоняется', async () => {
    const response = await CONSUME(
      request('/api/admin/orders/o1/consumption', { method: 'POST', body: { lines: [] } }),
      orderContext,
    );

    expect(response.status).toBe(400);
    expect(stock.consume).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Предел длины списка — предохранитель, а не косметика: на каждую строку
   * приходится несколько запросов к базе, и список на тысячу позиций положил бы
   * склад одним нажатием. Отказ обязан приходить от маршрута, до репозитория.
   */
  it('🔴 списание сверх предела в пятьдесят строк — 400 и ни одного похода в базу', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const line = { itemId: 's1', qty: 1, fromZoneId: 'z2' };
    const response = await CONSUME(
      request('/api/admin/orders/o1/consumption', {
        method: 'POST',
        body: { lines: Array.from({ length: 51 }, () => line) },
      }),
      orderContext,
    );

    expect(response.status).toBe(400);
    expect(stock.consume).not.toHaveBeenCalled();
  });

  it('ровно пятьдесят строк проходят: предел не отсекает разрешённое', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const line = { itemId: 's1', qty: 1, fromZoneId: 'z2' };
    const response = await CONSUME(
      request('/api/admin/orders/o1/consumption', {
        method: 'POST',
        body: { lines: Array.from({ length: 50 }, () => line) },
      }),
      orderContext,
    );

    expect(response.status).toBe(201);
    expect(stock.consume).toHaveBeenCalled();
  });

  it('🔴 отмена ошибочного списания отдаёт возврат, а не пустой ответ', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await CANCEL_CONSUMPTION(
      request('/api/admin/orders/o1/consumption/m1', { method: 'DELETE' }),
      moveContext,
    );

    expect(response.status).toBe(201);
    expect(stock.cancelConsumption).toHaveBeenCalledWith('o1', 'm1', {
      role: 'installer',
      userId: 'u2',
    });
    expect(await response.json()).toMatchObject({ movement: { id: 'm1' } });
  });
});
