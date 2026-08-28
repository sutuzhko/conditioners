// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-logout',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  dbMock: { session: { deleteMany: vi.fn() } },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { POST } = await import('./route');

// контекст этому маршруту не нужен, но тип обёртки требует второй аргумент
const post = (request: NextRequest): Promise<Response> => Promise.resolve(POST(request, undefined));

/** Значение как у настоящего токена: не-ASCII в заголовок cookie не положить. */
const TOKEN = 'live-session-token';

function logoutRequest(headers: Readonly<Record<string, string>> = {}): NextRequest {
  return new NextRequest(new URL('/api/auth/logout', 'https://example.test'), {
    method: 'POST',
    headers: { cookie: `session=${TOKEN}`, ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.session.deleteMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/auth/logout', () => {
  it('гасит cookie и удаляет сессию', async () => {
    const response = await post(logoutRequest());

    expect(response.status).toBe(204);
    expect(dbMock.session.deleteMany).toHaveBeenCalled();
    expect(response.headers.get('set-cookie') ?? '').toMatch(/^session=;/);
  });

  it('🔴 выход с чужого сайта отклоняется: чужая страница не выкидывает из панели', async () => {
    const response = await post(
      logoutRequest({ origin: 'https://evil.example', host: 'example.test' }),
    );

    expect(response.status).toBe(403);
    expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('свой origin проходит: кнопка «выйти» в панели работает', async () => {
    const response = await post(
      logoutRequest({ origin: 'https://example.test', host: 'example.test' }),
    );

    expect(response.status).toBe(204);
  });
});
