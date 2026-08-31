// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock, statMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-health',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
    // пустая строка = переменная не задана: маршрут не ходит за меткой
    BACKUP_MARK_PATH: '',
  },
  dbMock: {
    $queryRaw: vi.fn(),
    notification: { findFirst: vi.fn() },
  },
  statMock: vi.fn(),
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('node:fs/promises', () => ({ stat: statMock }));

const { GET } = await import('./route');

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  dbMock.notification.findFirst.mockResolvedValue(null);
  statMock.mockRejectedValue(new Error('метки нет'));
  testEnv.BACKUP_MARK_PATH = '';
});

describe('GET /api/health', () => {
  it('живая база и пустая очередь — ok без лага', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(readBody(response)).resolves.toEqual({
      ok: true,
      queueLagSeconds: null,
      backupAgeHours: null,
    });
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

  it('без переменной пути метка не ищется вовсе', async () => {
    const body = await readBody(await GET());

    expect(body.backupAgeHours).toBeNull();
    expect(statMock).not.toHaveBeenCalled();
  });

  it('свежая метка видна возрастом в часах', async () => {
    testEnv.BACKUP_MARK_PATH = '/backup/last-success';
    statMock.mockResolvedValue({ mtimeMs: Date.now() - 2 * 3_600_000 });

    const body = await readBody(await GET());

    expect(body.backupAgeHours).toBe(2);
    expect(statMock).toHaveBeenCalledWith('/backup/last-success');
  });

  it('метки на диске нет — null, а не падение проверки живости', async () => {
    testEnv.BACKUP_MARK_PATH = '/backup/last-success';

    const response = await GET();

    expect(response.status).toBe(200);
    expect((await readBody(response)).backupAgeHours).toBeNull();
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
