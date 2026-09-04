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
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены, и проверка доступа уходит в `cookies()` вне
   запроса. Без этой строки падают все проверки файла. */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/repo/clients', () => ({
  list: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fromLead: vi.fn(),
}));

vi.mock('@/server/repo/leads', () => ({ listByClient: vi.fn() }));

/* 🔴 Техника клиента подменяется наравне с обращениями: карточку собирают оба
   репозитория. Без этой подмены тест уходил в живую базу и был зелёным лишь
   там, где таблицы уже созданы, — в CI он падал пятисоткой (ADR-167). */
vi.mock('@/server/repo/client-units', () => ({ listByClient: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import * as clients from '@/server/repo/clients';
import * as units from '@/server/repo/client-units';
import * as leads from '@/server/repo/leads';

import { GET, POST } from './route';
import { DELETE, GET as GET_ONE, PATCH } from './[id]/route';
import { POST as TO_CLIENT } from '../leads/[id]/client/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const client = {
  id: 'c1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12, кв. 4',
  note: null,
  createdAt: '2026-08-20T09:00:00.000Z',
  leadCount: 1,
  orderCount: 0,
  orderSum: 0,
  lastOrderAt: null,
};

const page = { items: [client], total: 1, page: 1, pages: 1 };

const unit = {
  id: 'u-1',
  model: 'Fujitsu ASYG09',
  installedAt: '2026-07-14T00:00:00.000Z',
  warrantyUntil: '2029-07-14T00:00:00.000Z',
  photo: null,
  order: { id: 'o-1', number: 42 },
};

const body = {
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12, кв. 4',
  note: '',
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

const context = { params: Promise.resolve({ id: 'c1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(clients.list).mockResolvedValue(page);
  vi.mocked(clients.create).mockResolvedValue(client);
  vi.mocked(clients.findById).mockResolvedValue(client);
  vi.mocked(clients.update).mockResolvedValue(client);
  vi.mocked(clients.remove).mockResolvedValue(undefined);
  vi.mocked(clients.fromLead).mockResolvedValue({ client, created: true });
  vi.mocked(leads.listByClient).mockResolvedValue([]);
  vi.mocked(units.listByClient).mockResolvedValue([unit]);
});

describe('база клиентов', () => {
  it('без сессии список не отдаётся: это адреса и телефоны людей', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(request('/api/admin/clients'), undefined);

    expect(response.status).toBe(401);
    expect(clients.list).not.toHaveBeenCalled();
  });

  it('🔴 монтажник не видит базу: адрес он получает только со своим нарядом', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET(request('/api/admin/clients'), undefined);

    expect(response.status).toBe(403);
    expect(clients.list).not.toHaveBeenCalled();
  });

  it('🔴 и карточку по прямому адресу тоже не откроет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_ONE(request('/api/admin/clients/c1'), context);

    expect(response.status).toBe(403);
    expect(clients.findById).not.toHaveBeenCalled();
  });

  it('поиск и страница берутся из адреса', async () => {
    await GET(request('/api/admin/clients?q=Соколова&page=3'), undefined);

    expect(clients.list).toHaveBeenCalledWith({ query: 'Соколова', page: 3 });
  });

  it('мусор в номере страницы — это первая страница, а не отказ', async () => {
    await GET(request('/api/admin/clients?page=нет'), undefined);

    expect(clients.list).toHaveBeenCalledWith({ query: undefined, page: 1 });
  });

  it('владелец заводит клиента и получает 201', async () => {
    const response = await POST(request('/api/admin/clients', { method: 'POST', body }), undefined);

    expect(response.status).toBe(201);
    expect(clients.create).toHaveBeenCalledWith({
      name: body.name,
      phone: body.phone,
      address: body.address,
      /* Пустое поле формы — это «не заполнено», а не пустая строка в базе. */
      note: null,
    });
  });

  it('без телефона клиента не завести: по нему он опознаётся', async () => {
    const response = await POST(
      request('/api/admin/clients', { method: 'POST', body: { ...body, phone: '' } }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(clients.create).not.toHaveBeenCalled();
  });

  it('карточка отдаётся вместе с обращениями и техникой этого человека', async () => {
    const response = await GET_ONE(request('/api/admin/clients/c1'), context);

    expect(response.status).toBe(200);
    expect(leads.listByClient).toHaveBeenCalledWith('c1');
    expect(units.listByClient).toHaveBeenCalledWith('c1');
    /* Оба списка обязаны доехать до ответа: карточку открывают ради них. */
    await expect(response.json()).resolves.toMatchObject({ leads: [], units: [unit] });
  });

  it('пустая правка отклоняется: молча ничего не менять хуже, чем отказать', async () => {
    const response = await PATCH(
      request('/api/admin/clients/c1', { method: 'PATCH', body: {} }),
      context,
    );

    expect(response.status).toBe(400);
    expect(clients.update).not.toHaveBeenCalled();
  });

  it('удаление карточки отвечает 204', async () => {
    const response = await DELETE(request('/api/admin/clients/c1', { method: 'DELETE' }), context);

    expect(response.status).toBe(204);
    expect(clients.remove).toHaveBeenCalledWith('c1');
  });
});

describe('обращение → клиент', () => {
  const leadContext = { params: Promise.resolve({ id: 'l1' }) };

  it('🔴 монтажнику это действие закрыто', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await TO_CLIENT(
      request('/api/admin/leads/l1/client', { method: 'POST' }),
      leadContext,
    );

    expect(response.status).toBe(403);
    expect(clients.fromLead).not.toHaveBeenCalled();
  });

  it('новая карточка — 201', async () => {
    const response = await TO_CLIENT(
      request('/api/admin/leads/l1/client', { method: 'POST' }),
      leadContext,
    );

    expect(response.status).toBe(201);
    expect(clients.fromLead).toHaveBeenCalledWith('l1');
    expect(await response.json()).toMatchObject({ created: true });
  });

  it('🔴 знакомый номер — 200 и та же карточка: второго человека не заводим', async () => {
    vi.mocked(clients.fromLead).mockResolvedValue({ client, created: false });

    const response = await TO_CLIENT(
      request('/api/admin/leads/l1/client', { method: 'POST' }),
      leadContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ created: false, client: { id: 'c1' } });
  });
});
