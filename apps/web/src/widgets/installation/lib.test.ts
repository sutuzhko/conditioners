import { describe, expect, it } from 'vitest';

import { SAVINGS_MODEL, estimateSavings } from './lib';
import {
  HOURS_DEFAULT,
  HOURS_MAX,
  HOURS_MIN,
  TARIFF_DEFAULT,
  TARIFF_MAX,
  TARIFF_MIN,
} from './model';

/**
 * Формула перенесена из прототипа: расход = 0,75 кВт × часы × 120 дней × тариф,
 * инвертор — 62% от него. Числа в тестах посчитаны руками, а не сняты с
 * реализации: иначе тест подтвердит любую ошибку, которую в неё внесли.
 */
describe('Оценка экономии инвертора', () => {
  it('считает расход обычного кондиционера по формуле прототипа', () => {
    // 0,75 × 8 × 120 × 6,5 = 4680
    expect(
      estimateSavings({ hoursPerDay: HOURS_DEFAULT, tariff: TARIFF_DEFAULT }).usual,
    ).toBeCloseTo(4680, 6);
  });

  it('на нижней границе ползунков', () => {
    // 0,75 × 2 × 120 × 4 = 720; инвертор — 62% = 446,4
    const estimate = estimateSavings({ hoursPerDay: HOURS_MIN, tariff: TARIFF_MIN });

    expect(estimate.usual).toBeCloseTo(720, 6);
    expect(estimate.inverter).toBeCloseTo(446.4, 6);
    expect(estimate.saved).toBeCloseTo(273.6, 6);
  });

  it('на верхней границе ползунков', () => {
    // 0,75 × 16 × 120 × 9 = 12960; инвертор — 8035,2
    const estimate = estimateSavings({ hoursPerDay: HOURS_MAX, tariff: TARIFF_MAX });

    expect(estimate.usual).toBeCloseTo(12960, 6);
    expect(estimate.inverter).toBeCloseTo(8035.2, 6);
    expect(estimate.saved).toBeCloseTo(4924.8, 6);
  });

  it('экономия за горизонт — сезонная разница, умноженная на число лет', () => {
    const estimate = estimateSavings({ hoursPerDay: HOURS_DEFAULT, tariff: TARIFF_DEFAULT });

    expect(estimate.savedOverHorizon).toBeCloseTo(estimate.saved * SAVINGS_MODEL.horizonYears, 6);
    expect(estimate.savedOverHorizon).toBeCloseTo(8892, 6);
  });

  it('смена тарифа меняет результат пропорционально', () => {
    const cheap = estimateSavings({ hoursPerDay: HOURS_DEFAULT, tariff: 4 });
    const pricey = estimateSavings({ hoursPerDay: HOURS_DEFAULT, tariff: 8 });

    expect(pricey.usual).toBeGreaterThan(cheap.usual);
    expect(pricey.saved).toBeGreaterThan(cheap.saved);
    expect(pricey.saved).toBeCloseTo(cheap.saved * 2, 6);
  });

  it('смена часов работы меняет результат', () => {
    const short = estimateSavings({ hoursPerDay: 4, tariff: TARIFF_DEFAULT });
    const long = estimateSavings({ hoursPerDay: 12, tariff: TARIFF_DEFAULT });

    expect(long.usual).toBeCloseTo(short.usual * 3, 6);
  });

  it('инвертор всегда экономичнее, а доля расхода — та же, что рисует полоска', () => {
    const estimate = estimateSavings({ hoursPerDay: HOURS_DEFAULT, tariff: TARIFF_DEFAULT });

    expect(estimate.inverter).toBeLessThan(estimate.usual);
    expect(estimate.inverterShare).toBe(SAVINGS_MODEL.inverterShare);
    expect(estimate.inverter / estimate.usual).toBeCloseTo(estimate.inverterShare, 6);
  });

  it('нулевые и отрицательные входные данные не дают отрицательной экономии', () => {
    expect(estimateSavings({ hoursPerDay: 0, tariff: TARIFF_DEFAULT }).saved).toBe(0);
    expect(estimateSavings({ hoursPerDay: -5, tariff: -3 }).usual).toBe(0);
    expect(estimateSavings({ hoursPerDay: -5, tariff: -3 }).savedOverHorizon).toBe(0);
  });
});
