// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 Прайс отдаётся публично (`GET /api/prices`), поэтому ответ собирается
 * проекцией, а не строкой Prisma целиком: `id`, `createdAt` и `updatedAt` в
 * примере [API §4] не описаны, и наружу им незачем.
 */
const fake = vi.hoisted(() => ({
  db: { priceRow: { findMany: vi.fn() } },
  getExtras: vi.fn(),
}));

vi.mock('@/server/db', () => ({ db: fake.db }));
vi.mock('@/server/repo/settings', () => ({ getExtras: fake.getExtras, putGroup: vi.fn() }));

import { getPrices } from './prices';

beforeEach(() => {
  vi.clearAllMocks();
  fake.db.priceRow.findMany.mockResolvedValue([]);
  fake.getExtras.mockResolvedValue(null);
});

describe('чтение прайса', () => {
  it('🔴 запрашивает только поля контракта — служебные колонки наружу не едут', async () => {
    await getPrices();

    const [args] = fake.db.priceRow.findMany.mock.calls[0] ?? [];
    expect(args?.select).toEqual({
      cls: true,
      power: true,
      area: true,
      price: true,
      term: true,
      sort: true,
    });
    expect(args?.select).not.toHaveProperty('id');
  });

  it('порядок задаётся сортировкой, а не порядком вставки', async () => {
    await getPrices();

    const [args] = fake.db.priceRow.findMany.mock.calls[0] ?? [];
    expect(args?.orderBy).toEqual([{ sort: 'asc' }, { cls: 'asc' }]);
  });
});
