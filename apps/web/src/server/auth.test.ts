// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/repo/sessions', () => ({
  create: vi.fn(),
  findByTokenHash: vi.fn(),
  deleteByTokenHash: vi.fn(),
  deleteExpired: vi.fn(),
  deleteOtherForUser: vi.fn(),
}));

vi.mock('@/server/repo/admin-users', () => ({
  findByLogin: vi.fn(),
  findPasswordHash: vi.fn(),
  setPasswordHash: vi.fn(),
  markLogin: vi.fn(),
}));

vi.mock('@/server/repo/rate-limit', () => ({
  hit: vi.fn(),
  reset: vi.fn(),
  dropOlderThan: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { cookies } from 'next/headers';
import * as sessions from '@/server/repo/sessions';
import * as adminUsers from '@/server/repo/admin-users';
import * as rateLimit from '@/server/repo/rate-limit';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  destroySession,
  getAdminSession,
  hashPassword,
  hashToken,
  issueSession,
  changePassword,
  isOwner,
  login,
  readSession,
} from '@/server/auth';

const allowed = { allowed: true, hits: 1, retryAfterSec: 900 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimit.hit).mockResolvedValue(allowed);
  vi.mocked(sessions.create).mockResolvedValue({ id: 's1' });
  vi.mocked(sessions.findByTokenHash).mockResolvedValue(null);
});

describe('выдача сессии', () => {
  it('кладёт в базу хеш токена, а не сам токен', async () => {
    const now = new Date('2026-08-20T10:00:00Z');
    const { token, expiresAt } = await issueSession('u1', now);

    const [userId, storedHash, storedExpiry] = vi.mocked(sessions.create).mock.calls[0] ?? [];

    expect(userId).toBe('u1');
    expect(storedHash).toBe(hashToken(token));
    expect(storedHash).not.toBe(token);
    expect(storedExpiry).toEqual(expiresAt);
  });

  it('живёт 30 дней', async () => {
    const now = new Date('2026-08-20T10:00:00Z');
    const { expiresAt } = await issueSession('u1', now);

    expect(expiresAt.getTime() - now.getTime()).toBe(SESSION_TTL_MS);
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('каждый раз выдаёт новый токен', async () => {
    const first = await issueSession('u1');
    const second = await issueSession('u1');

    expect(first.token).not.toBe(second.token);
  });
});

describe('проверка сессии', () => {
  it('пустой токен сессией не считается', async () => {
    await expect(readSession(undefined)).resolves.toBeNull();
    await expect(readSession('')).resolves.toBeNull();
    expect(sessions.findByTokenHash).not.toHaveBeenCalled();
  });

  it('неизвестный токен не пускает', async () => {
    await expect(readSession('чужой-токен')).resolves.toBeNull();
  });

  it('возвращает администратора по действующему токену', async () => {
    const expiresAt = new Date('2026-09-20T10:00:00Z');
    vi.mocked(sessions.findByTokenHash).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      login: 'admin',
      name: null,
      role: 'owner',
      active: true,
      expiresAt,
    });

    const session = await readSession('токен', new Date('2026-08-20T10:00:00Z'));

    expect(session).toEqual({ userId: 'u1', login: 'admin', name: null, role: 'owner', expiresAt });
  });

  it('истёкшая сессия не действует и вычищается', async () => {
    vi.mocked(sessions.findByTokenHash).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      login: 'admin',
      name: null,
      role: 'owner',
      active: true,
      expiresAt: new Date('2026-08-19T10:00:00Z'),
    });

    const session = await readSession('токен', new Date('2026-08-20T10:00:00Z'));

    expect(session).toBeNull();
    expect(sessions.deleteExpired).toHaveBeenCalled();
  });

  it('берёт токен из cookie запроса', async () => {
    const expiresAt = new Date('2026-09-20T10:00:00Z');
    vi.mocked(sessions.findByTokenHash).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      login: 'admin',
      name: null,
      role: 'owner',
      active: true,
      expiresAt,
    });
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === SESSION_COOKIE ? { name, value: 'токен' } : undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getAdminSession()).resolves.toMatchObject({ login: 'admin' });
  });
});

describe('вход', () => {
  it('не пускает с неизвестным логином', async () => {
    vi.mocked(adminUsers.findByLogin).mockResolvedValue(null);

    const result = await login({ login: 'нет', password: 'пароль', ip: '10.0.0.1' });

    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('не пускает с неверным паролем', async () => {
    vi.mocked(adminUsers.findByLogin).mockResolvedValue({
      id: 'u1',
      login: 'admin',
      role: 'owner',
      active: true,
      passwordHash: await hashPassword('настоящий-пароль'),
    });

    const result = await login({ login: 'admin', password: 'не-тот', ip: '10.0.0.1' });

    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('пускает с верным паролем и ротирует старую сессию', async () => {
    vi.mocked(adminUsers.findByLogin).mockResolvedValue({
      id: 'u1',
      login: 'admin',
      role: 'owner',
      active: true,
      passwordHash: await hashPassword('верный-пароль'),
    });

    const result = await login({
      login: 'admin',
      password: 'верный-пароль',
      ip: '10.0.0.1',
      currentToken: 'старый-токен',
    });

    expect(result.ok).toBe(true);
    // старый cookie перестаёт работать — иначе подсунутый заранее токен переживёт вход
    expect(sessions.deleteByTokenHash).toHaveBeenCalledWith(hashToken('старый-токен'));
    expect(sessions.create).toHaveBeenCalledTimes(1);
    expect(adminUsers.markLogin).toHaveBeenCalledWith('u1', expect.any(Date));
    expect(rateLimit.reset).toHaveBeenCalledWith('login:10.0.0.1');
  });

  it('перебор по IP останавливается до проверки пароля', async () => {
    vi.mocked(rateLimit.hit).mockResolvedValue({ allowed: false, hits: 11, retryAfterSec: 42 });

    const result = await login({ login: 'admin', password: 'что-нибудь', ip: '10.0.0.1' });

    expect(result).toEqual({ ok: false, reason: 'rate_limited', retryAfterSec: 42 });
    expect(adminUsers.findByLogin).not.toHaveBeenCalled();
  });
});

describe('выход', () => {
  it('удаляет сессию по хешу токена', async () => {
    await destroySession('токен');

    expect(sessions.deleteByTokenHash).toHaveBeenCalledWith(hashToken('токен'));
  });

  it('без cookie ничего не удаляет', async () => {
    await destroySession(undefined);

    expect(sessions.deleteByTokenHash).not.toHaveBeenCalled();
  });
});

describe('отключённый доступ', () => {
  it('не пускает даже с верным паролем — и говорит, почему', async () => {
    vi.mocked(adminUsers.findByLogin).mockResolvedValue({
      id: 'u2',
      login: 'sokolov',
      role: 'installer',
      active: false,
      passwordHash: await hashPassword('верный-пароль'),
    });

    const result = await login({ login: 'sokolov', password: 'верный-пароль', ip: '10.0.0.1' });

    expect(result).toEqual({ ok: false, reason: 'disabled' });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('закрывает уже открытую сессию: cookie в телефоне уволенного перестаёт работать', async () => {
    vi.mocked(sessions.findByTokenHash).mockResolvedValue({
      id: 's1',
      userId: 'u2',
      login: 'sokolov',
      name: 'Дмитрий Соколов',
      role: 'installer',
      active: false,
      expiresAt: new Date('2026-09-20T10:00:00Z'),
    });

    await expect(readSession('токен', new Date('2026-08-20T10:00:00Z'))).resolves.toBeNull();
  });
});

describe('роль', () => {
  it('владелец отличается от монтажника', () => {
    const base = { userId: 'u1', login: 'admin', name: null, expiresAt: new Date() };

    expect(isOwner({ ...base, role: 'owner' })).toBe(true);
    expect(isOwner({ ...base, role: 'installer' })).toBe(false);
  });
});

describe('смена своего пароля', () => {
  it('без верного текущего пароля ничего не меняет', async () => {
    vi.mocked(adminUsers.findPasswordHash).mockResolvedValue(await hashPassword('настоящий'));

    const result = await changePassword({
      userId: 'u1',
      currentToken: 'токен',
      current: 'не-тот',
      next: 'новый-пароль',
    });

    expect(result).toBe('invalid_current');
    expect(adminUsers.setPasswordHash).not.toHaveBeenCalled();
  });

  it('меняет пароль и выгоняет остальные сессии, оставляя текущую', async () => {
    vi.mocked(adminUsers.findPasswordHash).mockResolvedValue(await hashPassword('настоящий'));

    const result = await changePassword({
      userId: 'u1',
      currentToken: 'токен',
      current: 'настоящий',
      next: 'новый-пароль',
    });

    expect(result).toBe('ok');
    expect(adminUsers.setPasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
    expect(sessions.deleteOtherForUser).toHaveBeenCalledWith('u1', hashToken('токен'));
  });
});
