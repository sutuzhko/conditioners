import { describe, expect, it } from 'vitest';

import { installRatesSchema } from '../model';
import { calculateInstallation } from './calculateInstallation';

/** Ставки как в сидах — но приходят аргументом, а не из кода. */
const rates = installRatesSchema.parse({ trassaPerM: 700, shtrobPerM: 800, heightWorks: 2000 });

const base = { basePrice: 6000, trassaM: 3, floor: 1, shtroblenie: false, qty: 1 };

describe('calculateInstallation', () => {
  it('трасса ровно 3 метра доплаты не даёт — она входит в базу', () => {
    const estimate = calculateInstallation(base, rates);

    expect(estimate.total).toBe(6000);
    expect(estimate.lines).toEqual([{ kind: 'base', amount: 6000 }]);
  });

  it('трасса меньше включённой не уходит в минус', () => {
    expect(calculateInstallation({ ...base, trassaM: 1 }, rates).total).toBe(6000);
  });

  it('считает только метры сверх включённых', () => {
    const estimate = calculateInstallation({ ...base, trassaM: 5 }, rates);

    expect(estimate.total).toBe(6000 + 2 * 700);
    expect(estimate.lines).toContainEqual({
      kind: 'trassa',
      meters: 2,
      rate: 700,
      amount: 1400,
    });
  });

  it('высотные работы начинаются с десятого этажа', () => {
    expect(calculateInstallation({ ...base, floor: 9 }, rates).total).toBe(6000);
    expect(calculateInstallation({ ...base, floor: 10 }, rates).total).toBe(8000);
    expect(calculateInstallation({ ...base, floor: 25 }, rates).total).toBe(8000);
  });

  it('штробление считается по всей длине трассы, а не по метрам сверх базы', () => {
    const estimate = calculateInstallation({ ...base, trassaM: 5, shtroblenie: true }, rates);

    expect(estimate.lines).toContainEqual({
      kind: 'shtroblenie',
      meters: 5,
      rate: 800,
      amount: 4000,
    });
    expect(estimate.perUnit).toBe(6000 + 1400 + 4000);
  });

  it('количество умножает итог, но не разбивку', () => {
    const estimate = calculateInstallation(
      { basePrice: 6000, trassaM: 6, floor: 12, shtroblenie: true, qty: 3 },
      rates,
    );

    // 6000 + 3×700 + 2000 + 6×800 = 14 900 за блок
    expect(estimate.perUnit).toBe(14_900);
    expect(estimate.total).toBe(44_700);
    expect(estimate.lines.map((l) => l.kind)).toEqual(['base', 'trassa', 'height', 'shtroblenie']);
  });

  it('разбивка складывается в сумму за блок', () => {
    const estimate = calculateInstallation(
      { basePrice: 5500, trassaM: 7.5, floor: 14, shtroblenie: true, qty: 2 },
      rates,
    );
    const sum = estimate.lines.reduce((acc, line) => acc + line.amount, 0);

    expect(sum).toBe(estimate.perUnit);
    expect(estimate.total).toBe(estimate.perUnit * 2);
  });

  it('нулевые ставки не порождают пустых строк в разбивке', () => {
    const free = installRatesSchema.parse({ trassaPerM: 0, shtrobPerM: 0, heightWorks: 0 });
    const estimate = calculateInstallation(
      { basePrice: 6000, trassaM: 10, floor: 20, shtroblenie: true, qty: 1 },
      free,
    );

    expect(estimate.lines).toHaveLength(1);
    expect(estimate.total).toBe(6000);
  });

  it('включённые метры и порог этажа берутся из ставок, а не из кода', () => {
    const custom = installRatesSchema.parse({
      trassaPerM: 700,
      shtrobPerM: 800,
      heightWorks: 2000,
      trassaIncludedM: 5,
      heightFloorFrom: 6,
    });

    expect(calculateInstallation({ ...base, trassaM: 5 }, custom).total).toBe(6000);
    expect(calculateInstallation({ ...base, floor: 6 }, custom).total).toBe(8000);
  });
});
