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

/* Подмена репозитория команды разрывает цикл импортов `auth` → `admin-users`
   → `http` → `auth`; без неё проверка доступа уходит в `cookies()` вне
   запроса (см. соседний route.test.ts). */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/repo/client-units', () => ({
  listByClient: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/server/repo/clients', () => ({ findById: vi.fn(), remove: vi.fn(), update: vi.fn() }));
vi.mock('@/server/repo/leads', () => ({ listByClient: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import * as units from '@/server/repo/client-units';
import * as clients from '@/server/repo/clients';
import * as leads from '@/server/repo/leads';

import { GET as GET_CLIENT } from './[id]/route';
import { POST } from './[id]/units/route';
import { DELETE, PATCH } from './[id]/units/[unitId]/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const unit = {
  id: 'un1',
  model: 'Сплит-система 09',
  installedAt: '2026-07-14T06:30:00.000Z',
  warrantyUntil: '2029-07-14T00:00:00.000Z',
  photo: '/api/media/after-1.jpg',
  order: { id: 'o1', number: 1059 },
};

const client = {
  id: 'c1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12, кв. 4',
  note: null,
  createdAt: '2026-08-20T09:00:00.000Z',
  leadCount: 1,
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
const unitContext = { params: Promise.resolve({ id: 'c1', unitId: 'un1' }) };

const body = { model: 'Сплит-система 09', installedAt: '2019-06-01', warrantyUntil: '' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(units.listByClient).mockResolvedValue([unit]);
  vi.mocked(units.create).mockResolvedValue(unit);
  vi.mocked(units.update).mockResolvedValue(unit);
  vi.mocked(units.remove).mockResolvedValue(undefined);
  vi.mocked(clients.findById).mockResolvedValue(client);
  vi.mocked(leads.listByClient).mockResolvedValue([]);
});

describe('техника клиента', () => {
  it('карточка клиента отдаётся вместе с техникой', async () => {
    const response = await GET_CLIENT(request('/api/admin/clients/c1'), context);

    expect(response.status).toBe(200);
    expect(units.listByClient).toHaveBeenCalledWith('c1');
    expect(await response.json()).toMatchObject({ units: [{ id: 'un1' }] });
  });

  it('🔴 монтажнику техника клиента закрыта: адрес он получает со своим нарядом', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const post = await POST(request('/api/admin/clients/c1/units', { method: 'POST', body }), {
      params: Promise.resolve({ id: 'c1' }),
    });
    const patch = await PATCH(
      request('/api/admin/clients/c1/units/un1', { method: 'PATCH', body: { model: 'Другое' } }),
      { params: Promise.resolve({ id: 'c1', unitId: 'un1' }) },
    );
    const del = await DELETE(request('/api/admin/clients/c1/units/un1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'c1', unitId: 'un1' }),
    });

    expect([post.status, patch.status, del.status]).toEqual([403, 403, 403]);
    expect(units.create).not.toHaveBeenCalled();
    expect(units.update).not.toHaveBeenCalled();
    expect(units.remove).not.toHaveBeenCalled();
  });

  it('без сессии запись не завести', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await POST(
      request('/api/admin/clients/c1/units', { method: 'POST', body }),
      context,
    );

    expect(response.status).toBe(401);
    expect(units.create).not.toHaveBeenCalled();
  });

  it('владелец заводит запись руками и получает 201', async () => {
    const response = await POST(
      request('/api/admin/clients/c1/units', { method: 'POST', body }),
      context,
    );

    expect(response.status).toBe(201);
    expect(units.create).toHaveBeenCalledWith('c1', {
      model: 'Сплит-система 09',
      installedAt: '2019-06-01',
      /* Пустое поле гарантии — это «не записана», а не сегодняшнее число. */
      warrantyUntil: null,
    });
  });

  it('без даты монтажа записи нет: от неё считается и гарантия, и ТО', async () => {
    const response = await POST(
      request('/api/admin/clients/c1/units', {
        method: 'POST',
        body: { ...body, installedAt: '' },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(units.create).not.toHaveBeenCalled();
  });

  it('выдуманной даты не бывает', async () => {
    const response = await POST(
      request('/api/admin/clients/c1/units', {
        method: 'POST',
        body: { ...body, installedAt: '2026-02-31' },
      }),
      context,
    );

    expect(response.status).toBe(400);
  });

  it('правка меняет только присланное', async () => {
    const response = await PATCH(
      request('/api/admin/clients/c1/units/un1', {
        method: 'PATCH',
        body: { warrantyUntil: '2030-01-01' },
      }),
      unitContext,
    );

    expect(response.status).toBe(200);
    expect(units.update).toHaveBeenCalledWith('c1', 'un1', { warrantyUntil: '2030-01-01' });
  });

  it('пустая правка отклоняется: молча ничего не менять хуже, чем отказать', async () => {
    const response = await PATCH(
      request('/api/admin/clients/c1/units/un1', { method: 'PATCH', body: {} }),
      unitContext,
    );

    expect(response.status).toBe(400);
    expect(units.update).not.toHaveBeenCalled();
  });

  it('удаление записи отвечает 204 и сверяет её с клиентом', async () => {
    const response = await DELETE(
      request('/api/admin/clients/c1/units/un1', { method: 'DELETE' }),
      unitContext,
    );

    expect(response.status).toBe(204);
    expect(units.remove).toHaveBeenCalledWith('c1', 'un1');
  });
});
