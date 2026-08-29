// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 Цена по акции обязана быть ниже обычной, и сверить это может только тот,
 * кто знает обычную: в теле запроса её нет и быть не должно (ADR-011, инвариант
 * 14). Поэтому проверка живёт здесь, а не в схеме.
 */
const fake = vi.hoisted(() => ({
  db: { product: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock('@/server/db', () => ({ db: fake.db }));

import { ApiException } from '@/server/http';
import { setSale } from './products';

const REGULAR_PRICE = 40_000;

const row = {
  id: 'p1',
  slug: 'model',
  badge: '09',
  name: 'Модель',
  brand: null,
  sku: null,
  areaMax: 25,
  tag: null,
  priceNum: REGULAR_PRICE,
  salePrice: null,
  saleFrom: null,
  saleTo: null,
  saleLabel: null,
  link: null,
  visible: true,
  featured: false,
  sort: 0,
  seoTitle: null,
  seoDescription: null,
  photos: [],
  specs: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  fake.db.product.findUnique.mockResolvedValue({ priceNum: REGULAR_PRICE });
  fake.db.product.update.mockResolvedValue(row);
});

describe('установка скидки', () => {
  it('цена ниже обычной — сохраняется', async () => {
    await setSale('p1', { salePrice: 34_900, saleLabel: null });

    expect(fake.db.product.update).toHaveBeenCalled();
  });

  it('🔴 цена выше обычной — отказ, а не молчаливое сохранение', async () => {
    await expect(setSale('p1', { salePrice: 45_000, saleLabel: null })).rejects.toBeInstanceOf(
      ApiException,
    );
    expect(fake.db.product.update).not.toHaveBeenCalled();
  });

  it('🔴 цена, равная обычной, — тоже отказ: скидки в ноль процентов не бывает', async () => {
    await expect(
      setSale('p1', { salePrice: REGULAR_PRICE, saleLabel: null }),
    ).rejects.toMatchObject({ code: 'validation_error', field: 'salePrice' });
    expect(fake.db.product.update).not.toHaveBeenCalled();
  });

  it('отказ называет обычную цену: иначе владельцу негде её посмотреть', async () => {
    await expect(setSale('p1', { salePrice: 45_000, saleLabel: null })).rejects.toMatchObject({
      message: expect.stringContaining(String(REGULAR_PRICE)),
    });
  });

  it('снятие скидки проверкой цены не задевается', async () => {
    await setSale('p1', { salePrice: null, saleLabel: null });

    expect(fake.db.product.update).toHaveBeenCalled();
  });

  it('модели нет — «не найдена», а не отказ по цене', async () => {
    fake.db.product.findUnique.mockResolvedValue(null);

    await expect(setSale('нет', { salePrice: 1, saleLabel: null })).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
