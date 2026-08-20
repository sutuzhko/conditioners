// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ db: { $queryRaw: vi.fn() } }));

import { db } from '@/server/db';
import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('проверка здоровья', () => {
  it('живая база — 200 { ok: true }', async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('база недоступна — 503, а не 200 с пустым телом', async () => {
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error('connection refused'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});
