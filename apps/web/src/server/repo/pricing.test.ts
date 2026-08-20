// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getActivePrice } from '@/server/repo/pricing';

const base = { priceNum: 38_500, salePrice: null, saleFrom: null, saleTo: null };

describe('действующая цена', () => {
  it('без скидки отдаёт обычную цену и не рисует зачёркнутую', () => {
    expect(getActivePrice(base)).toEqual({
      currentPrice: 38_500,
      oldPrice: null,
      discountPercent: 0,
      saleActive: false,
    });
  });

  it('считает процент из конечной цены, а не наоборот', () => {
    const result = getActivePrice({ ...base, salePrice: 34_900 });

    expect(result.currentPrice).toBe(34_900);
    expect(result.oldPrice).toBe(38_500);
    expect(result.discountPercent).toBe(9);
    expect(result.saleActive).toBe(true);
  });

  it('до начала периода скидки нет', () => {
    const result = getActivePrice(
      { ...base, salePrice: 34_900, saleFrom: new Date('2026-09-01T00:00:00+03:00') },
      new Date('2026-08-31T12:00:00+03:00'),
    );

    expect(result.saleActive).toBe(false);
    expect(result.currentPrice).toBe(38_500);
  });

  it('после окончания периода скидка снимается сама', () => {
    const result = getActivePrice(
      { ...base, salePrice: 34_900, saleTo: new Date('2026-10-31T23:59:59.999+03:00') },
      new Date('2026-11-01T09:00:00+03:00'),
    );

    expect(result.saleActive).toBe(false);
    expect(result.oldPrice).toBeNull();
  });

  it('внутри периода скидка действует', () => {
    const result = getActivePrice(
      {
        ...base,
        salePrice: 34_900,
        saleFrom: new Date('2026-09-01T00:00:00+03:00'),
        saleTo: new Date('2026-10-31T23:59:59.999+03:00'),
      },
      new Date('2026-10-01T09:00:00+03:00'),
    );

    expect(result.saleActive).toBe(true);
  });

  it('цена «со скидкой» выше обычной скидкой не считается', () => {
    const result = getActivePrice({ ...base, salePrice: 41_000 });

    expect(result.saleActive).toBe(false);
    expect(result.currentPrice).toBe(38_500);
  });
});
