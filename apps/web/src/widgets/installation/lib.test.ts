import { describe, expect, it } from 'vitest';

import { SAVINGS_MODEL, estimateSavings, isNightHour } from './lib';
import { HOURS_IN_DAY, TARIFF_DAY_DEFAULT, TARIFF_NIGHT_DEFAULT } from './model';

/**
 * Формула перенесена из макета: расход = 0,75 кВт × 120 дней × стоимость
 * киловатт-часов за сутки, инвертор — 62% от него. Числа в тестах посчитаны
 * руками, а не сняты с реализации: иначе тест подтвердит любую ошибку,
 * которую в неё внесли.
 */

/** Отметки суток из списка часов: то же, что делает сетка в интерфейсе. */
function flags(...hours: readonly number[]): boolean[] {
  const marks = Array.from({ length: HOURS_IN_DAY }, () => false);
  for (const hour of hours) marks[hour] = true;
  return marks;
}

/** Непрерывный отрезок часов: `range(12, 20)` — с 12:00 до 20:00. */
function range(from: number, to: number): boolean[] {
  const hours: number[] = [];
  for (let hour = from; hour < to; hour += 1) hours.push(hour);
  return flags(...hours);
}

const ALL_DAY = range(0, HOURS_IN_DAY);
const NONE = flags();

describe('Ночная зона', () => {
  it('идёт с 23:00 до 07:00 и пересекает полночь', () => {
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(6)).toBe(true);
    expect(isNightHour(7)).toBe(false);
    expect(isNightHour(22)).toBe(false);
  });

  it('в сутках восемь ночных часов и шестнадцать дневных', () => {
    const estimate = estimateSavings({
      hours: ALL_DAY,
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.nightHours).toBe(8);
    expect(estimate.dayHours).toBe(16);
    expect(estimate.totalHours).toBe(24);
  });
});

describe('Оценка экономии инвертора — единый тариф', () => {
  it('считает расход по формуле макета', () => {
    // 0,75 × 120 × 8 ч × 6,5 = 4680; инвертор — 62%, то есть 2901,6
    const estimate = estimateSavings({
      hours: range(12, 20),
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.totalHours).toBe(8);
    expect(estimate.usual).toBeCloseTo(4680, 6);
    expect(estimate.inverter).toBeCloseTo(2901.6, 6);
    expect(estimate.saved).toBeCloseTo(1778.4, 6);
  });

  it('ночная ставка на результат не влияет', () => {
    const cheapNight = estimateSavings({
      hours: range(0, 8),
      mode: 'single',
      tariffDay: 6,
      tariffNight: 2,
    });
    const dearNight = estimateSavings({
      hours: range(0, 8),
      mode: 'single',
      tariffDay: 6,
      tariffNight: 6,
    });

    expect(dearNight.usual).toBe(cheapNight.usual);
    // 0,75 × 120 × 8 ч × 6 = 4320 — все часы по дневной ставке
    expect(cheapNight.usual).toBeCloseTo(4320, 6);
  });

  it('круглые сутки считаются по двадцати четырём часам', () => {
    // 0,75 × 120 × 24 ч × 6,5 = 14040
    expect(
      estimateSavings({
        hours: ALL_DAY,
        mode: 'single',
        tariffDay: TARIFF_DAY_DEFAULT,
        tariffNight: TARIFF_NIGHT_DEFAULT,
      }).usual,
    ).toBeCloseTo(14040, 6);
  });
});

describe('Оценка экономии инвертора — день и ночь', () => {
  it('дневные и ночные часы считаются по своим ставкам', () => {
    // день 12–20 это 8 дневных часов, ночь 23–03 — 4 ночных
    // 0,75 × 120 × (8 × 6,5 + 4 × 3,1) = 90 × 64,4 = 5796
    const estimate = estimateSavings({
      hours: flags(12, 13, 14, 15, 16, 17, 18, 19, 23, 0, 1, 2),
      mode: 'dual',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.dayHours).toBe(8);
    expect(estimate.nightHours).toBe(4);
    expect(estimate.usual).toBeCloseTo(5796, 6);
  });

  it('только ночные часы — дневная ставка в расчёт не входит', () => {
    // 0,75 × 120 × 8 × 3,1 = 2232
    const estimate = estimateSavings({
      hours: range(23, 24).map((on, hour) => on || hour < 7),
      mode: 'dual',
      tariffDay: 10,
      tariffNight: 3.1,
    });

    expect(estimate.dayHours).toBe(0);
    expect(estimate.nightHours).toBe(8);
    expect(estimate.usual).toBeCloseTo(2232, 6);
  });

  it('только дневные часы — ночная ставка в расчёт не входит', () => {
    // 0,75 × 120 × 16 × 6,5 = 9360
    const estimate = estimateSavings({
      hours: range(7, 23),
      mode: 'dual',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: 2,
    });

    expect(estimate.nightHours).toBe(0);
    expect(estimate.dayHours).toBe(16);
    expect(estimate.usual).toBeCloseTo(9360, 6);
  });

  it('на одних дневных часах оба режима дают одно и то же', () => {
    const hours = range(9, 18);
    const single = estimateSavings({ hours, mode: 'single', tariffDay: 7, tariffNight: 3 });
    const dual = estimateSavings({ hours, mode: 'dual', tariffDay: 7, tariffNight: 3 });

    expect(dual.usual).toBeCloseTo(single.usual, 6);
  });

  it('ночной тариф ниже дневного — двухтарифный режим выгоднее', () => {
    const hours = flags(0, 1, 2, 12, 13, 14);
    const single = estimateSavings({ hours, mode: 'single', tariffDay: 6.5, tariffNight: 3.1 });
    const dual = estimateSavings({ hours, mode: 'dual', tariffDay: 6.5, tariffNight: 3.1 });

    expect(dual.usual).toBeLessThan(single.usual);
  });
});

describe('Оценка экономии инвертора — границы и свойства', () => {
  it('ни одного отмеченного часа — весь расчёт нулевой', () => {
    const estimate = estimateSavings({
      hours: NONE,
      mode: 'dual',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.totalHours).toBe(0);
    expect(estimate.usual).toBe(0);
    expect(estimate.inverter).toBe(0);
    expect(estimate.saved).toBe(0);
    expect(estimate.savedOverHorizon).toBe(0);
  });

  it('расход растёт пропорционально числу отмеченных часов', () => {
    const four = estimateSavings({
      hours: range(12, 16),
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });
    const twelve = estimateSavings({
      hours: range(8, 20),
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(twelve.usual).toBeCloseTo(four.usual * 3, 6);
    expect(twelve.saved).toBeCloseTo(four.saved * 3, 6);
  });

  it('расход растёт пропорционально тарифу', () => {
    const cheap = estimateSavings({
      hours: range(12, 20),
      mode: 'single',
      tariffDay: 3,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });
    const pricey = estimateSavings({
      hours: range(12, 20),
      mode: 'single',
      tariffDay: 9,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(pricey.saved).toBeCloseTo(cheap.saved * 3, 6);
  });

  it('экономия за горизонт — сезонная разница, умноженная на число лет', () => {
    const estimate = estimateSavings({
      hours: range(12, 20),
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.savedOverHorizon).toBeCloseTo(estimate.saved * SAVINGS_MODEL.horizonYears, 6);
    expect(estimate.savedOverHorizon).toBeCloseTo(8892, 6);
  });

  it('инвертор всегда экономичнее, а доля расхода — та же, что рисует полоска', () => {
    const estimate = estimateSavings({
      hours: range(12, 20),
      mode: 'single',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: TARIFF_NIGHT_DEFAULT,
    });

    expect(estimate.inverter).toBeLessThan(estimate.usual);
    expect(estimate.inverterShare).toBe(SAVINGS_MODEL.inverterShare);
    expect(estimate.inverter / estimate.usual).toBeCloseTo(estimate.inverterShare, 6);
  });

  it('отрицательные тарифы не дают отрицательной экономии', () => {
    const estimate = estimateSavings({
      hours: ALL_DAY,
      mode: 'dual',
      tariffDay: -6,
      tariffNight: -3,
    });

    expect(estimate.usual).toBe(0);
    expect(estimate.saved).toBe(0);
  });

  it('короткий список отметок не ломает расчёт — недостающие часы выключены', () => {
    const estimate = estimateSavings({
      hours: [true, true],
      mode: 'dual',
      tariffDay: TARIFF_DAY_DEFAULT,
      tariffNight: 3,
    });

    expect(estimate.nightHours).toBe(2);
    expect(estimate.dayHours).toBe(0);
    // 0,75 × 120 × 2 × 3 = 540
    expect(estimate.usual).toBeCloseTo(540, 6);
  });
});
