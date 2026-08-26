// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

vi.mock('@/server/repo/admin-users', () => ({
  findById: vi.fn(),
  update: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as adminUsers from '@/server/repo/admin-users';

import { GET, PATCH } from './route';

const installer = {
  userId: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  role: 'installer',
  expiresAt: new Date('2026-12-31'),
} as const;

const owner = { ...installer, userId: 'u1', login: 'admin', name: null, role: 'owner' } as const;

const me = {
  id: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  phone: '+7 (910) 155-24-68',
  role: 'installer' as const,
  employment: 'self_employed' as const,
  active: true,
  createdAt: '2026-04-10T09:00:00.000Z',
  lastLoginAt: null,
};

const URL_PROFILE = 'https://tulaklimat.ru/api/admin/profile';

function patchRequest(payload: unknown): NextRequest {
  return new NextRequest(URL_PROFILE, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

function getRequest(): NextRequest {
  return new NextRequest(URL_PROFILE, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(installer);
  vi.mocked(adminUsers.findById).mockResolvedValue(me);
  vi.mocked(adminUsers.update).mockResolvedValue(me);
});

describe('оформление в своём профиле', () => {
  it('видно на чтение: человек знает, как он оформлен', async () => {
    const response = await GET(getRequest(), undefined);
    const payload: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ employment: 'self_employed' });
  });

  it('🔴 монтажник не меняет оформление себе — это условие расчётов', async () => {
    const response = await PATCH(patchRequest({ employment: 'contract' }), undefined);

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('🔴 и владелец себе — тоже: оформление заводится в разделе команды', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(owner);

    const response = await PATCH(patchRequest({ employment: null }), undefined);

    expect(response.status).toBe(403);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it('имя и телефон профиль правит по-прежнему', async () => {
    const response = await PATCH(patchRequest({ name: 'Дмитрий С.' }), undefined);

    expect(response.status).toBe(200);
    expect(adminUsers.update).toHaveBeenCalledWith('u2', { name: 'Дмитрий С.' });
  });
});
