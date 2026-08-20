import { describe, expect, it } from 'vitest';

import { getActivePrice, type SalePricing } from './getActivePrice';

const product = (over: Partial<SalePricing> = {}): SalePricing => ({
  priceNum: 38_500,
  salePrice: null,
  saleFrom: null,
  saleTo: null,
  saleLabel: null,
  ...over,
});

const at = (iso: string): Date => new Date(iso);

describe('getActivePrice', () => {
  it('без salePrice скидки нет и перечёркивать нечего', () => {
    expect(getActivePrice(product(), at('2026-09-15T12:00:00Z'))).toEqual({
      currentPrice: 38_500,
      oldPrice: null,
      discountPercent: null,
      saleActive: false,
      saleLabel: null,
      saleTo: null,
    });
  });

  it('бессрочная скидка действует всегда', () => {
    const result = getActivePrice(product({ salePrice: 34_900 }), at('2030-01-01T00:00:00Z'));

    expect(result.saleActive).toBe(true);
    expect(result.currentPrice).toBe(34_900);
    expect(result.oldPrice).toBe(38_500);
  });

  it('процент округляется по правилам PROJECT §2.8', () => {
    // 1 − 34900/38500 = 0.0935… → 9%
    expect(getActivePrice(product({ salePrice: 34_900 })).discountPercent).toBe(9);
    expect(getActivePrice(product({ priceNum: 40_000, salePrice: 30_000 })).discountPercent).toBe(
      25,
    );
  });

  const withPeriod = product({
    salePrice: 34_900,
    saleFrom: at('2026-09-01T00:00:00Z'),
    saleTo: at('2026-10-31T00:00:00Z'),
    saleLabel: 'Осенняя цена',
  });

  it('в день начала периода скидка уже действует', () => {
    expect(getActivePrice(withPeriod, at('2026-09-01T00:00:00Z')).saleActive).toBe(true);
    expect(getActivePrice(withPeriod, at('2026-09-01T23:59:59Z')).saleActive).toBe(true);
  });

  it('в день окончания периода скидка ещё действует весь день', () => {
    expect(getActivePrice(withPeriod, at('2026-10-31T00:00:00Z')).saleActive).toBe(true);
    expect(getActivePrice(withPeriod, at('2026-10-31T23:59:59Z')).saleActive).toBe(true);
  });

  it('за сутки до начала и на следующий день после конца скидки нет', () => {
    expect(getActivePrice(withPeriod, at('2026-08-31T23:59:59Z')).saleActive).toBe(false);
    expect(getActivePrice(withPeriod, at('2026-11-01T00:00:00Z')).saleActive).toBe(false);
  });

  it('период снимается сам: после окончания цена обычная', () => {
    const result = getActivePrice(withPeriod, at('2026-11-05T10:00:00Z'));

    expect(result.currentPrice).toBe(38_500);
    expect(result.oldPrice).toBeNull();
    expect(result.saleLabel).toBeNull();
  });

  it('открытая нижняя граница означает «с самого начала»', () => {
    const openStart = product({ salePrice: 30_000, saleTo: at('2026-10-31T00:00:00Z') });

    expect(getActivePrice(openStart, at('2020-01-01T00:00:00Z')).saleActive).toBe(true);
    expect(getActivePrice(openStart, at('2026-11-01T00:00:00Z')).saleActive).toBe(false);
  });

  it('открытая верхняя граница означает «без ограничения»', () => {
    const openEnd = product({ salePrice: 30_000, saleFrom: at('2026-09-01T00:00:00Z') });

    expect(getActivePrice(openEnd, at('2026-08-31T00:00:00Z')).saleActive).toBe(false);
    expect(getActivePrice(openEnd, at('2099-01-01T00:00:00Z')).saleActive).toBe(true);
  });

  it('цена «со скидкой» не ниже обычной скидкой не считается', () => {
    expect(getActivePrice(product({ salePrice: 38_500 })).saleActive).toBe(false);
    expect(getActivePrice(product({ salePrice: 42_000 })).saleActive).toBe(false);
    expect(getActivePrice(product({ salePrice: 0 })).saleActive).toBe(false);
  });

  it('подпись и дата окончания отдаются для плашки и разметки Offer', () => {
    const result = getActivePrice(withPeriod, at('2026-09-10T00:00:00Z'));

    expect(result.saleLabel).toBe('Осенняя цена');
    expect(result.saleTo).toEqual(at('2026-10-31T00:00:00Z'));
  });
});
