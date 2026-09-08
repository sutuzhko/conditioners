// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

vi.mock('@/server/repo/admin-users', () => ({ setAccess: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import { ROLE_REFUSAL } from '@/server/http';
import * as adminUsers from '@/server/repo/admin-users';

import { PATCH } from './route';

/**
 * Раздача прав — ручка владельца (ADR-344, issue #784, #785).
 *
 * 🔴 Проверяется не только «кто прошёл», но и **что до базы доехало**:
 * разрешение, потерянное схемой, снаружи выглядит как «владелец не нажал
 * переключатель», и обнаруживается это отказом администратору.
 */
const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2030-01-01'),
} as const;

const administrator = {
  ...owner,
  userId: 'u2',
  login: 'ivanova',
  role: 'admin',
  permissions: ['team', 'people'],
} as const;

const card = {
  id: 'u3',
  login: 'petrova',
  name: 'Анна Петрова',
  phone: null,
  role: 'admin' as const,
  employment: null,
  inn: null,
  permissions: ['leads' as const],
  active: true,
  createdAt: '2026-09-01T09:00:00.000Z',
  lastLoginAt: null,
};

function request(payload: unknown): NextRequest {
  return new NextRequest('https://tulaklimat.ru/api/admin/staff/u3/access', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

const context = { params: Promise.resolve({ id: 'u3' }) };

async function messageOf(response: Response): Promise<string> {
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('error' in body)) return '';

  const error: unknown = body.error;
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';

  return typeof error.message === 'string' ? error.message : '';
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(adminUsers.setAccess).mockResolvedValue(card);
});

describe('владелец раздаёт права', () => {
  it('набор доезжает до базы в порядке словаря и без повторов', async () => {
    const response = await PATCH(
      request({ permissions: ['data_delete', 'leads', 'leads', 'crm'] }),
      context,
    );

    expect(response.status).toBe(200);
    expect(adminUsers.setAccess).toHaveBeenCalledWith('u3', {
      permissions: ['crm', 'leads', 'data_delete'],
    });
  });

  it('роль меняется той же ручкой', async () => {
    const response = await PATCH(request({ role: 'manager' }), context);

    expect(response.status).toBe(200);
    expect(adminUsers.setAccess).toHaveBeenCalledWith('u3', { role: 'manager' });
  });

  it('пустое тело не принимается: сохранять нечего', async () => {
    const response = await PATCH(request({}), context);

    expect(response.status).toBe(400);
    expect(adminUsers.setAccess).not.toHaveBeenCalled();
  });

  it('🔴 выдуманное разрешение отклоняется, а не молча выбрасывается', async () => {
    const response = await PATCH(request({ permissions: ['leads', 'всё'] }), context);

    expect(response.status).toBe(400);
    expect(adminUsers.setAccess).not.toHaveBeenCalled();
  });

  it('🔴 лишнее поле в теле не проезжает мимо схемы', async () => {
    const response = await PATCH(request({ permissions: [], active: true }), context);

    expect(response.status).toBe(400);
    expect(adminUsers.setAccess).not.toHaveBeenCalled();
  });
});

describe('🔴 владелец в системе один', () => {
  it('вторую роль владельца выдать нельзя, и до базы запрос не доходит', async () => {
    const response = await PATCH(request({ role: 'owner' }), context);

    expect({ status: response.status, message: await messageOf(response) }).toEqual({
      status: 400,
      message: 'Владелец в системе один — вторую такую роль выдать нельзя',
    });
    expect(adminUsers.setAccess).not.toHaveBeenCalled();
  });
});

describe('🔴 администратор прав не раздаёт — ни чужих, ни своих', () => {
  it.each([
    ['чужие', 'u3'],
    ['свои', 'u2'],
  ])('%s права: отказ, и до базы запрос не доходит', async (_case, id) => {
    vi.mocked(getAdminSession).mockResolvedValue(administrator);

    const response = await PATCH(request({ permissions: ['leads'] }), {
      params: Promise.resolve({ id }),
    });

    expect({ status: response.status, message: await messageOf(response) }).toEqual({
      status: 403,
      message: ROLE_REFUSAL,
    });
    expect(adminUsers.setAccess).not.toHaveBeenCalled();
  });

  it('монтажнику и менеджеру отказ тот же', async () => {
    const statuses: number[] = [];

    for (const role of ['manager', 'installer'] as const) {
      vi.mocked(getAdminSession).mockResolvedValue({ ...owner, userId: 'u9', role });
      statuses.push((await PATCH(request({ permissions: [] }), context)).status);
    }

    expect(statuses).toEqual([403, 403]);
  });

  it('без сессии — 401', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    expect((await PATCH(request({ permissions: [] }), context)).status).toBe(401);
  });
});
