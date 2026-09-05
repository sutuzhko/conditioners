// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: подменяются только чтение сессии и закрытие остальных —
   проверяется маршрут, а не хеширование токена. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
  logoutOtherSessions: vi.fn(),
}));

/* 🔴 Подмена репозитория команды разрывает цикл импортов: `auth` тянет
   `repo/admin-users`, тот — `http` ради `ApiException`, а `http` — обратно
   `auth`. Без неё проверка доступа уходит в `cookies()` вне запроса. */
vi.mock('@/server/repo/admin-users', () => ({}));

import { getAdminSession, logoutOtherSessions } from '@/server/auth';

import { DELETE } from './route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: 'Сергей Демидов',
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

function request(cookie?: string): NextRequest {
  const next = new NextRequest('https://tulaklimat.ru/api/admin/profile/sessions', {
    method: 'DELETE',
  });
  if (cookie !== undefined) next.cookies.set('session', cookie);
  return next;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
});

describe('DELETE /api/admin/profile/sessions', () => {
  it('🔴 закрывает чужие сессии и оставляет текущую', async () => {
    const response = await DELETE(request('токен-этого-браузера'), undefined);

    expect(response.status).toBe(204);
    expect(logoutOtherSessions).toHaveBeenCalledWith('u1', 'токен-этого-браузера');
  });

  it('без сессии в панель не пускают', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await DELETE(request(), undefined);

    expect(response.status).toBe(401);
    expect(logoutOtherSessions).not.toHaveBeenCalled();
  });

  it('монтажник закрывает свои устройства так же, как владелец', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({ ...owner, userId: 'u2', role: 'installer' });

    const response = await DELETE(request('токен'), undefined);

    expect(response.status).toBe(204);
    expect(logoutOtherSessions).toHaveBeenCalledWith('u2', 'токен');
  });
});
