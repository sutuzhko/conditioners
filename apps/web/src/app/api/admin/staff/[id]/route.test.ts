// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
  hashPassword: vi.fn(async () => 'хеш'),
}));

vi.mock('@/server/repo/admin-users', () => ({
  findDetails: vi.fn(),
  listNotes: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as adminUsers from '@/server/repo/admin-users';

import { GET, PATCH } from './route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const card = {
  id: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  phone: null,
  role: 'installer' as const,
  employment: 'self_employed' as const,
  inn: '710703123450',
  active: true,
  createdAt: '2026-04-10T09:00:00.000Z',
  lastLoginAt: null,
};

function getRequest(): NextRequest {
  return new NextRequest('https://tulaklimat.ru/api/admin/staff/u2', { method: 'GET' });
}

function patchRequest(payload: unknown): NextRequest {
  return new NextRequest('https://tulaklimat.ru/api/admin/staff/u2', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(adminUsers.update).mockResolvedValue(card);
  vi.mocked(adminUsers.findDetails).mockResolvedValue(card);
  vi.mocked(adminUsers.listNotes).mockResolvedValue([]);
});

describe('оформление монтажника — правка карточки', () => {
  it('владелец заводит оформление, и оно доходит до базы', async () => {
    const response = await PATCH(patchRequest({ employment: 'contract' }), context('u2'));

    expect(response.status).toBe(200);
    expect(adminUsers.update).toHaveBeenCalledWith('u2', { employment: 'contract' });
  });

  it('пустое значение снимает оформление, а не остаётся строкой', async () => {
    await PATCH(patchRequest({ employment: '' }), context('u2'));

    expect(adminUsers.update).toHaveBeenCalledWith('u2', { employment: null });
  });

  it('🔴 монтажник не меняет оформление другому: раздел закрыт целиком', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(patchRequest({ employment: 'self_employed' }), context('u3'));

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('🔴 и себе — тоже: своей карточкой он сюда не дотянется', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(patchRequest({ employment: 'self_employed' }), context('u2'));

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('🔴 владелец не меняет оформление себе: это условие расчётов, не настройка', async () => {
    const response = await PATCH(patchRequest({ employment: 'staff' }), context('u1'));

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('оформление вне словаря отклоняется', async () => {
    const response = await PATCH(patchRequest({ employment: 'подряд' }), context('u2'));

    expect(response.status).toBe(400);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });
});

describe('ИНН монтажника — правка карточки', () => {
  it('🔴 владелец видит ИНН в карточке: без него статус не проверить', async () => {
    const response = await GET(getRequest(), context('u2'));
    const payload: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ inn: '710703123450' });
  });

  it('верный ИНН доходит до базы', async () => {
    const response = await PATCH(patchRequest({ inn: '710703123450' }), context('u2'));

    expect(response.status).toBe(200);
    expect(adminUsers.update).toHaveBeenCalledWith('u2', { inn: '710703123450' });
  });

  it('🔴 пустое значение снимает ИНН и сохранение не блокирует', async () => {
    const response = await PATCH(patchRequest({ inn: '' }), context('u2'));

    expect(response.status).toBe(200);
    expect(adminUsers.update).toHaveBeenCalledWith('u2', { inn: null });
  });

  it('ИНН с опиской отклоняется — контрольные разряды не сходятся', async () => {
    const response = await PATCH(patchRequest({ inn: '710512345678' }), context('u2'));

    expect(response.status).toBe(400);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('🔴 монтажник до чужого ИНН не дотянется: раздел закрыт целиком', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await PATCH(patchRequest({ inn: '710703123450' }), context('u3'));

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });
});
