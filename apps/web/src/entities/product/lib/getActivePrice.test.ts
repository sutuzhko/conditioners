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

  /**
   * 🔴 «−0%» запрещён не примером, а перебором.
   *
   * Отдельный пример проверяет одну пару чисел и молчит обо всех остальных, а
   * ноль рождается округлением — то есть на границе, которую пример выбирает
   * наугад. Здесь перебираются все цены со скидкой в опасной зоне (там, где
   * процент меньше полутора) и вся шкала целиком с крупным шагом: ни одна
   * комбинация не имеет права дать плашку «−0%» (DESIGN_BRIEF §10).
   *
   * Проверка мутационная по построению: убери `percent === 0 ? null : percent`
   * из `getActivePrice`, и она падает на первой же паре.
   */
  it('🔴 ни одна комбинация цены и скидки не даёт «−0%»', () => {
    const prices = [999, 6_000, 38_500, 100_000, 250_000] as const;
    const seen = { rounded: 0, kept: 0 };

    for (const priceNum of prices) {
      /* Опасная зона: разница меньше полутора процентов. Именно здесь
         `Math.round` даёт ноль, и именно её пример обычно не покрывает. */
      const danger = Math.ceil(priceNum * 0.015);
      const samples = new Set<number>();

      for (let back = 1; back <= danger; back += 1) samples.add(priceNum - back);
      // и вся шкала целиком, чтобы «нигде» означало нигде, а не «около границы»
      for (let sale = 1; sale < priceNum; sale += Math.ceil(priceNum / 200)) samples.add(sale);

      for (const salePrice of samples) {
        const result = getActivePrice(product({ priceNum, salePrice }), at('2026-09-15T12:00:00Z'));

        expect(result.saleActive, `${priceNum} → ${salePrice}`).toBe(true);
        expect(result.discountPercent, `${priceNum} → ${salePrice}`).not.toBe(0);

        if (result.discountPercent === null) seen.rounded += 1;
        else {
          seen.kept += 1;
          // раз процент показан, он обязан быть настоящим, а не «почти нулём»
          expect(result.discountPercent, `${priceNum} → ${salePrice}`).toBeGreaterThanOrEqual(1);
        }
      }
    }

    /* Обе ветки обязаны быть пройдены. Без этого перебор, случайно
       разошедшийся с реальностью — например, если опасная зона перестанет
       попадать в округление, — остался бы зелёным, ничего не проверив. */
    expect(seen.rounded).toBeGreaterThan(0);
    expect(seen.kept).toBeGreaterThan(0);
  });

  /**
   * Граница округления названа числом, а не описана словами: скидка в
   * полпроцента — это первая, которую владелец видит плашкой.
   */
  it('граница между «процента нет» и «процент есть» проходит по половине', () => {
    // 38 500 → 38 308 это 0,4988% — округляется в ноль, плашки нет
    expect(getActivePrice(product({ salePrice: 38_308 })).discountPercent).toBeNull();
    // 38 500 → 38 307 это 0,5013% — округляется в единицу, плашка появляется
    expect(getActivePrice(product({ salePrice: 38_307 })).discountPercent).toBe(1);
  });
});
