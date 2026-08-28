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

  it('процент округляется по правилам PROJECT §2.9', () => {
    // 1 − 34900/38500 = 0.0935… → 9%
    expect(getActivePrice(product({ salePrice: 34_900 })).discountPercent).toBe(9);
    expect(getActivePrice(product({ priceNum: 40_000, salePrice: 30_000 })).discountPercent).toBe(
      25,
    );
  });

  it('🔴 скидка, округляющаяся в ноль процентов, процентом не показывается', () => {
    // 1 − 38400/38500 = 0.0026 → 0%. Сотня рублей — это сумма, а не процент,
    // и плашка «−0%» запрещена дословно (DESIGN_BRIEF §10)
    const result = getActivePrice(product({ salePrice: 38_400 }));

    expect(result.saleActive).toBe(true);
    expect(result.currentPrice).toBe(38_400);
    expect(result.oldPrice).toBe(38_500);
    expect(result.discountPercent).toBeNull();
  });

  it('половина процента округляется вверх и процентом остаётся', () => {
    // 1 − 38300/38500 = 0.0052 → 1%
    expect(getActivePrice(product({ salePrice: 38_300 })).discountPercent).toBe(1);
  });

  const withPeriod = product({
    salePrice: 34_900,
    saleFrom: at('2026-09-01T00:00:00+03:00'),
    saleTo: at('2026-10-31T23:59:59.999+03:00'),
    saleLabel: 'Осенняя цена',
  });

  it('в день начала периода скидка уже действует', () => {
    expect(getActivePrice(withPeriod, at('2026-09-01T00:00:00+03:00')).saleActive).toBe(true);
    expect(getActivePrice(withPeriod, at('2026-09-01T23:59:59+03:00')).saleActive).toBe(true);
  });

  it('в день окончания периода скидка ещё действует весь день', () => {
    expect(getActivePrice(withPeriod, at('2026-10-31T00:00:00+03:00')).saleActive).toBe(true);
    expect(getActivePrice(withPeriod, at('2026-10-31T23:59:59+03:00')).saleActive).toBe(true);
  });

  it('за сутки до начала и на следующий день после конца скидки нет', () => {
    expect(getActivePrice(withPeriod, at('2026-08-31T23:59:59+03:00')).saleActive).toBe(false);
    expect(getActivePrice(withPeriod, at('2026-11-01T00:00:00+03:00')).saleActive).toBe(false);
  });

  /**
   * 🔴 Границы считаются по Москве (ADR-030, отменяет соответствующий пункт
   * ADR-029): «до 31 октября» заканчивается в полночь по Туле, а не в три
   * часа ночи первого ноября, когда владелец уже спит, а посетитель ещё видит
   * скидку в выдаче.
   */
  it('скидка заканчивается в полночь по Туле, а не по Гринвичу', () => {
    // 23:30 по Москве последнего дня — скидка ещё видна на витрине
    expect(getActivePrice(withPeriod, at('2026-10-31T20:30:00Z')).saleActive).toBe(true);
    // 21:00 UTC — это уже полночь 1 ноября в Туле: период закончился,
    // хотя по UTC 31 октября ещё не наступила даже середина ночи
    expect(getActivePrice(withPeriod, at('2026-10-31T21:00:00Z')).saleActive).toBe(false);
    expect(getActivePrice(withPeriod, at('2026-10-31T23:59:00Z')).saleActive).toBe(false);
  });

  it('граница, записанная календарной полуночью UTC, считается тем же днём', () => {
    const stored = product({
      salePrice: 34_900,
      saleFrom: at('2026-09-01T00:00:00Z'),
      saleTo: at('2026-10-31T00:00:00Z'),
    });

    expect(getActivePrice(stored, at('2026-09-01T00:00:00+03:00')).saleActive).toBe(true);
    expect(getActivePrice(stored, at('2026-10-31T23:59:59+03:00')).saleActive).toBe(true);
    expect(getActivePrice(stored, at('2026-11-01T00:00:00+03:00')).saleActive).toBe(false);
  });

  it('период снимается сам: после окончания цена обычная', () => {
    const result = getActivePrice(withPeriod, at('2026-11-05T10:00:00+03:00'));

    expect(result.currentPrice).toBe(38_500);
    expect(result.oldPrice).toBeNull();
    expect(result.saleLabel).toBeNull();
  });

  it('открытая нижняя граница означает «с самого начала»', () => {
    const openStart = product({ salePrice: 30_000, saleTo: at('2026-10-31T00:00:00+03:00') });

    expect(getActivePrice(openStart, at('2020-01-01T00:00:00Z')).saleActive).toBe(true);
    expect(getActivePrice(openStart, at('2026-11-01T00:00:00+03:00')).saleActive).toBe(false);
  });

  it('открытая верхняя граница означает «без ограничения»', () => {
    const openEnd = product({ salePrice: 30_000, saleFrom: at('2026-09-01T00:00:00+03:00') });

    expect(getActivePrice(openEnd, at('2026-08-31T00:00:00+03:00')).saleActive).toBe(false);
    expect(getActivePrice(openEnd, at('2099-01-01T00:00:00Z')).saleActive).toBe(true);
  });

  it('цена «со скидкой» не ниже обычной скидкой не считается', () => {
    expect(getActivePrice(product({ salePrice: 38_500 })).saleActive).toBe(false);
    expect(getActivePrice(product({ salePrice: 42_000 })).saleActive).toBe(false);
    expect(getActivePrice(product({ salePrice: 0 })).saleActive).toBe(false);
  });

  it('подпись и дата окончания отдаются для плашки и разметки Offer', () => {
    const result = getActivePrice(withPeriod, at('2026-09-10T00:00:00+03:00'));

    expect(result.saleLabel).toBe('Осенняя цена');
    expect(result.saleTo).toEqual(at('2026-10-31T23:59:59.999+03:00'));
  });
});
