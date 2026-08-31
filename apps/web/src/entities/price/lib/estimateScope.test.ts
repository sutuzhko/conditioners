import { describe, expect, it } from 'vitest';

import { estimateScope } from './estimateScope';

/** Границы шкал калькулятора, на которых формула считает честно. */
const limits = { trassaMaxM: 15, qtyMax: 4 } as const;

/** Ввод калькулятора: меняем только то, что проверяем. */
function input(patch: Partial<{ trassaM: number; qty: number }> = {}) {
  return { basePrice: 6_000, trassaM: 5, floor: 1, shtroblenie: false, qty: 1, ...patch };
}

describe('Граница честного расчёта монтажа', () => {
  it('внутри шкал смета считается по формуле', () => {
    expect(estimateScope(input(), limits)).toBe('formula');
  });

  it('🔴 трасса на верхнем делении шкалы уводит расчёт на выезд', () => {
    /* Ползунок останавливается на пятнадцати метрах, и отличить их от
       двадцати пяти интерфейс не может: точную сумму показывать нельзя. */
    expect(estimateScope(input({ trassaM: limits.trassaMaxM }), limits)).toBe('site-visit');
    expect(estimateScope(input({ trassaM: limits.trassaMaxM - 1 }), limits)).toBe('formula');
  });

  it('🔴 предельное количество блоков уводит расчёт на выезд', () => {
    /* Четыре блока — это мульти-сплит: один наружный блок на несколько
       внутренних, и умножение цены одиночного монтажа там не работает. */
    expect(estimateScope(input({ qty: limits.qtyMax }), limits)).toBe('site-visit');
    expect(estimateScope(input({ qty: limits.qtyMax - 1 }), limits)).toBe('formula');
  });

  it('границы приходят аргументом, а не зашиты в функцию', () => {
    const narrow = { trassaMaxM: 8, qtyMax: 2 } as const;

    expect(estimateScope(input({ trassaM: 8 }), narrow)).toBe('site-visit');
    expect(estimateScope(input({ trassaM: 8 }), limits)).toBe('formula');
    expect(estimateScope(input({ qty: 2 }), narrow)).toBe('site-visit');
    expect(estimateScope(input({ qty: 2 }), limits)).toBe('formula');
  });

  it('значение сверх шкалы — тоже выезд: снаружи приходят любые числа', () => {
    expect(estimateScope(input({ trassaM: 40 }), limits)).toBe('site-visit');
    expect(estimateScope(input({ qty: 9 }), limits)).toBe('site-visit');
  });
});
