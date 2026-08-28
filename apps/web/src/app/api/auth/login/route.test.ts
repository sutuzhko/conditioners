// @vitest-environment node
import { createHmac } from 'node:crypto';
import { hash as argonHash } from '@node-rs/argon2';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-login',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  dbMock: {
    adminUser: { findUnique: vi.fn(), update: vi.fn() },
    session: { create: vi.fn(), deleteMany: vi.fn() },
    rateLimit: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { POST } = await import('./route');

// контекст этому маршруту не нужен, но тип обёртки withRoute требует второй аргумент
const post = (request: Parameters<typeof POST>[0]): Promise<Response> =>
  Promise.resolve(POST(request, undefined));

const PASSWORD = 'верный-пароль-владельца';

// Хеш считается настоящим argon2id один раз на файл: тест проверки пароля,
// который подменяет проверку пароля, ничего не проверяет.
const PASSWORD_HASH = await argonHash(PASSWORD);

const OWNER_ROW = {
  id: 'u1',
  login: 'owner',
  passwordHash: PASSWORD_HASH,
  role: 'OWNER',
  active: true,
};

/** Тот же HMAC, что в auth.hashToken, — посчитан независимо, чтобы закрепить формат хранения. */
function hmacOf(token: string): string {
  return createHmac('sha256', testEnv.SESSION_SECRET).update(token).digest('hex');
}

function loginRequest(
  payload: unknown,
  headers: Readonly<Record<string, string>> = {},
): NextRequest {
  // строка уходит в тело как есть — так отправляется заведомо битый JSON
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return new NextRequest(new URL('/api/auth/login', 'https://example.test'), {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function cookieToken(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  const match = /session=([^;]+)/.exec(header);
  return match?.[1] ?? '';
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.rateLimit.upsert.mockResolvedValue({ hits: 1 });
  dbMock.rateLimit.deleteMany.mockResolvedValue({ count: 1 });
  dbMock.adminUser.findUnique.mockResolvedValue(OWNER_ROW);
  dbMock.adminUser.update.mockResolvedValue(OWNER_ROW);
  dbMock.session.create.mockResolvedValue({ id: 'sess-1' });
  dbMock.session.deleteMany.mockResolvedValue({ count: 0 });
});

describe('POST /api/auth/login', () => {
  it('пускает по верным логину и паролю: 204 и защищённый cookie', async () => {
    const response = await post(loginRequest({ login: 'owner', password: PASSWORD }));

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');

    // контракт docs/API.md §1: HttpOnly + Secure + SameSite=Lax, срок задан явно
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/^session=/);
    expect(setCookie).toMatch(/httponly/i);
    expect(setCookie).toMatch(/secure/i);
    expect(setCookie).toMatch(/samesite=lax/i);
    expect(setCookie).toMatch(/path=\//i);
    expect(setCookie).toMatch(/expires=/i);
  });

  it('кладёт в базу HMAC токена, а не сам токен', async () => {
    const response = await post(loginRequest({ login: 'owner', password: PASSWORD }));

    const token = cookieToken(response);
    expect(token).not.toBe('');

    // дамп таблицы sessions не должен давать возможность войти
    const created = dbMock.session.create.mock.calls[0]?.[0];
    expect(created?.data).toMatchObject({ userId: 'u1', tokenHash: hmacOf(token) });
    expect(created?.data.tokenHash).not.toBe(token);
    expect(created?.data.expiresAt).toBeInstanceOf(Date);
  });

  it('неизвестный логин и неверный пароль неотличимы снаружи', async () => {
    dbMock.adminUser.findUnique.mockResolvedValueOnce(null);
    const unknownLogin = await post(loginRequest({ login: 'кто-то', password: PASSWORD }));

    const wrongPassword = await post(loginRequest({ login: 'owner', password: 'не тот пароль' }));

    // одинаковые статус и тело: перебирающий не должен узнать, что логин угадан
    expect(unknownLogin.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    await expect(readBody(unknownLogin)).resolves.toEqual(await readBody(wrongPassword));
    expect(dbMock.session.create).not.toHaveBeenCalled();
  });

  it('при переборе отвечает 429 и не ходит за пользователем в базу', async () => {
    // лимит входа — 10 попыток на окно, одиннадцатая обязана упереться
    dbMock.rateLimit.upsert.mockResolvedValue({ hits: 11 });

    const response = await post(
      loginRequest({ login: 'owner', password: PASSWORD }, { 'x-forwarded-for': '203.0.113.9' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(429);
    expect(body.error).toMatchObject({ code: 'rate_limited' });
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    // счётчик стоит до запроса пользователя: перебор не должен трогать даже чтение
    expect(dbMock.adminUser.findUnique).not.toHaveBeenCalled();
    expect(dbMock.rateLimit.upsert.mock.calls[0]?.[0].create.key).toBe('login:203.0.113.9');
  });

  it('после удачного входа счётчик неудач по этому адресу сбрасывается', async () => {
    await post(
      loginRequest({ login: 'owner', password: PASSWORD }, { 'x-forwarded-for': '203.0.113.9' }),
    );

    expect(dbMock.rateLimit.deleteMany).toHaveBeenCalledWith({
      where: { key: 'login:203.0.113.9' },
    });
  });

  it('невалидное тело отклоняется без обращения к пользователям', async () => {
    const broken: readonly unknown[] = [
      { login: '', password: 'x' },
      { login: 'owner' },
      { login: 'owner', password: PASSWORD, extra: true },
      'это вообще не json',
    ];

    for (const payload of broken) {
      const response = await post(loginRequest(payload));
      expect(response.status).toBe(400);
      expect((await readBody(response)).error).toMatchObject({ code: 'validation_error' });
    }

    expect(dbMock.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('предъявленный при входе старый cookie уничтожается (ротация)', async () => {
    // значение как у настоящего токена: base64url, в заголовок cookie
    // не-ASCII всё равно не положить
    const stale = 'stale-token-planted-before-login';
    const response = await post(
      loginRequest({ login: 'owner', password: PASSWORD }, { cookie: `session=${stale}` }),
    );

    // защита от session fixation: кука, с которой пришли, перестаёт работать
    expect(dbMock.session.deleteMany.mock.calls[0]?.[0]).toEqual({
      where: { tokenHash: hmacOf(stale) },
    });

    // старая сессия удаляется раньше, чем создаётся новая
    const [destroyOrder] = dbMock.session.deleteMany.mock.invocationCallOrder;
    const [createOrder] = dbMock.session.create.mock.invocationCallOrder;
    expect(Number(destroyOrder)).toBeLessThan(Number(createOrder));

    expect(cookieToken(response)).not.toBe(stale);
  });

  it('🔴 вход с чужого сайта отклоняется: иначе владельца заводят в клон панели', async () => {
    const response = await post(
      loginRequest(
        { login: 'owner', password: PASSWORD },
        { origin: 'https://evil.example', host: 'example.test' },
      ),
    );

    expect(response.status).toBe(403);
    expect((await readBody(response)).error).toMatchObject({ code: 'forbidden' });
    // до пароля дело не доходит вовсе, и cookie не ставится
    expect(dbMock.adminUser.findUnique).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('свой origin проходит: обычный вход со стенда не ломается', async () => {
    const response = await post(
      loginRequest(
        { login: 'owner', password: PASSWORD },
        { origin: 'https://example.test', host: 'example.test' },
      ),
    );

    expect(response.status).toBe(204);
  });

  it('отключённый доступ с верным паролем — 403, сессия не создаётся', async () => {
    dbMock.adminUser.findUnique.mockResolvedValue({ ...OWNER_ROW, active: false });

    const response = await post(loginRequest({ login: 'owner', password: PASSWORD }));

    // до этой ветки доходит только знающий пароль, поэтому причина не скрывается
    expect(response.status).toBe(403);
    expect((await readBody(response)).error).toMatchObject({ code: 'forbidden' });
    expect(dbMock.session.create).not.toHaveBeenCalled();
  });
});
