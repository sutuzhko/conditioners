// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-health',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  dbMock: {
    $queryRaw: vi.fn(),
    notification: { findFirst: vi.fn() },
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { GET } = await import('./route');

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  dbMock.notification.findFirst.mockResolvedValue(null);
});

describe('GET /api/health', () => {
  it('живая база и пустая очередь — ok без лага', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(readBody(response)).resolves.toEqual({ ok: true, queueLagSeconds: null });
  });

  it('созревшая, но не разобранная запись очереди видна возрастом в секундах', async () => {
    dbMock.notification.findFirst.mockResolvedValue({
      nextTryAt: new Date(Date.now() - 90_000),
    });

    const body = await readBody(await GET());

    // допуск в пару секунд: между моком и Date.now() в маршруте идёт время
    expect(Number(body.queueLagSeconds)).toBeGreaterThanOrEqual(89);
    expect(Number(body.queueLagSeconds)).toBeLessThanOrEqual(92);
  });

  it('недоступная база — 503, а не зелёный ответ', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dbMock.$queryRaw.mockRejectedValue(new Error('нет соединения'));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(readBody(response)).resolves.toEqual({ ok: false });
    expect(spy).toHaveBeenCalled();
  });
});
