// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: подменяются только вход в сессию и сама смена пароля,
   остальное берётся настоящим — проверяется защита маршрута, а не argon2. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
  changePassword: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. Без этой строки проверка доступа уходит в `cookies()` вне
   запроса и падает весь файл. */
vi.mock('@/server/repo/admin-users', () => ({}));

vi.mock('@/server/repo/rate-limit', () => ({ hit: vi.fn(), reset: vi.fn() }));

import { changePassword, getAdminSession } from '@/server/auth';
import * as rateLimit from '@/server/repo/rate-limit';

import { POST } from './route';

const installer = {
  userId: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  role: 'installer',
  expiresAt: new Date('2026-12-31'),
} as const;

const BODY = { current: 'старый-пароль', next: 'новый-пароль-подлиннее' };

function request(payload: unknown = BODY): NextRequest {
  return new NextRequest('https://tulaklimat.ru/api/admin/profile/password', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

function allow(): void {
  vi.mocked(rateLimit.hit).mockResolvedValue({ allowed: true, hits: 1, retryAfterSec: 900 });
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(installer);
  vi.mocked(changePassword).mockResolvedValue('ok');
  allow();
});

describe('POST /api/admin/profile/password — ограничение частоты', () => {
  it('🔴 перебор текущего пароля упирается в счётчик, как и на входе', async () => {
    vi.mocked(rateLimit.hit).mockResolvedValue({ allowed: false, hits: 11, retryAfterSec: 420 });

    const response = await POST(request(), undefined);

    expect(response.status).toBe(429);
    expect((await readBody(response)).error).toMatchObject({ code: 'rate_limited' });
    expect(response.headers.get('retry-after')).toBe('420');
    // до проверки пароля дело не доходит: перебор не должен даже считать хеш
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('🔴 считается по учётной записи и не открывается упавшим счётчиком', async () => {
    await POST(request(), undefined);

    const [key, limit, windowMs, , failMode] = vi.mocked(rateLimit.hit).mock.calls[0] ?? [];

    // ключ по человеку, а не по адресу: сессию оставили на его же компьютере
    expect(key).toBe('password:u2');
    expect(limit).toBe(10);
    expect(windowMs).toBe(15 * 60 * 1000);
    expect(failMode).toBe('closed');
  });

  it('неверный текущий пароль по-прежнему 400 — и попытка засчитана', async () => {
    vi.mocked(changePassword).mockResolvedValue('invalid_current');

    const response = await POST(request(), undefined);

    expect(response.status).toBe(400);
    expect(rateLimit.hit).toHaveBeenCalled();
    expect(rateLimit.reset).not.toHaveBeenCalled();
  });

  it('удачная смена сбрасывает счётчик: человек вспомнил пароль', async () => {
    const response = await POST(request(), undefined);

    expect(response.status).toBe(204);
    expect(rateLimit.reset).toHaveBeenCalledWith('password:u2');
  });

  it('битое тело отклоняется до счётчика: это не попытка подбора', async () => {
    const response = await POST(request({ current: '' }), undefined);

    expect(response.status).toBe(400);
    expect(rateLimit.hit).not.toHaveBeenCalled();
  });
});
