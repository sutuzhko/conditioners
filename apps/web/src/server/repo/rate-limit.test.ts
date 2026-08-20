// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
  dbMock: { rateLimit: { upsert: vi.fn(), deleteMany: vi.fn() } },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));

const { dropOlderThan, hit, reset } = await import('@/server/repo/rate-limit');

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.rateLimit.deleteMany.mockResolvedValue({ count: 0 });
});

describe('счётчик частоты', () => {
  it('считает попытки в фиксированном окне', async () => {
    dbMock.rateLimit.upsert.mockResolvedValue({ hits: 3 });

    const verdict = await hit('login:10.0.0.1', 5, 60_000, new Date('2026-08-20T10:00:30Z'));

    expect(verdict).toEqual({ allowed: true, hits: 3, retryAfterSec: 30 });
    expect(dbMock.rateLimit.upsert.mock.calls[0]?.[0].where.key_windowAt.windowAt).toEqual(
      new Date('2026-08-20T10:00:00Z'),
    );
  });

  it('за пределами лимита отказывает и говорит, сколько ждать', async () => {
    dbMock.rateLimit.upsert.mockResolvedValue({ hits: 6 });

    const verdict = await hit('leads:10.0.0.1', 5, 60_000, new Date('2026-08-20T10:00:15Z'));

    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSec).toBe(45);
  });

  /** 🔴 Отказать живому клиенту из-за сбоя вспомогательной таблицы дороже, чем пропустить бота. */
  it('при недоступности своей таблицы пропускает запрос дальше', async () => {
    dbMock.rateLimit.upsert.mockRejectedValue(new Error('соединение потеряно'));

    const verdict = await hit('leads:10.0.0.1', 1, 60_000, new Date('2026-08-20T10:00:00Z'));

    expect(verdict.allowed).toBe(true);
  });

  it('сброс и чистка старых окон ходят в одну таблицу', async () => {
    await reset('login:10.0.0.1');
    await dropOlderThan(new Date('2026-08-19T00:00:00Z'));

    expect(dbMock.rateLimit.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { key: 'login:10.0.0.1' },
    });
    expect(dbMock.rateLimit.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { windowAt: { lt: new Date('2026-08-19T00:00:00Z') } },
    });
  });
});
