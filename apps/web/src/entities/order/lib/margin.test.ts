import { describe, expect, it } from 'vitest';

import { orderMargin, totalMargin, type MarginMaterial } from './margin';

/**
 * Маржа — деньги владельца, и ошибка в ней дороже ошибки в вёрстке. Поэтому
 * проверяется арифметика, а не вид: сколько получилось, что считается
 * неизвестным и почему (ADR-310, issue #628).
 */

const money = { price: 38_500, installerFee: 9_000, deductionSum: 0 };

function consume(qty: number, unitCost: number | null): MarginMaterial {
  return { kind: 'consume', qty, unitCost };
}

function back(qty: number, unitCost: number | null): MarginMaterial {
  return { kind: 'return', qty, unitCost };
}

describe('Маржа наряда', () => {
  it('без материалов равна разнице суммы и выплаты', () => {
    const margin = orderMargin(money, []);

    expect(margin).toEqual({ known: true, materials: 0, value: 29_500 });
  });

  it('вычитает материалы по движениям', () => {
    /* 4 метра по 250 ₽ и 2 кронштейна по 300 ₽ — 1600 ₽ расхода. */
    const margin = orderMargin(money, [consume(4, 250), consume(2, 300)]);

    expect(margin).toEqual({ known: true, materials: 1_600, value: 27_900 });
  });

  it('🔴 возврат с объекта уменьшает расход, а не увеличивает', () => {
    const margin = orderMargin(money, [consume(10, 250), back(4, 250)]);

    expect(margin).toEqual({ known: true, materials: 1_500, value: 28_000 });
  });

  it('🔴 удержание прибавляется: эти деньги остались у компании', () => {
    const withDeduction = { price: 38_500, installerFee: 9_000, deductionSum: 500 };

    const margin = orderMargin(withDeduction, [consume(4, 250)]);

    expect(margin).toEqual({ known: true, materials: 1_000, value: 29_000 });
  });

  it('🔴 отрицательная маржа показывается как есть: убыточный наряд не прячется', () => {
    const cheap = { price: 5_000, installerFee: 4_000, deductionSum: 0 };

    const margin = orderMargin(cheap, [consume(10, 250)]);

    expect(margin).toEqual({ known: true, materials: 2_500, value: -1_500 });
  });

  it('🔴 округление одно и в конце, а не построчно', () => {
    /* Три строки по 0,5 ₽ — это 1,5 ₽, то есть 2 ₽ после округления. Округли
       каждую строку отдельно, и получилось бы 3 ₽ из воздуха. */
    const margin = orderMargin({ price: 100, installerFee: 0, deductionSum: 0 }, [
      consume(0.5, 1),
      consume(0.5, 1),
      consume(0.5, 1),
    ]);

    expect(margin).toEqual({ known: true, materials: 2, value: 98 });
  });

  it('🔴 дробное количество считается по трём знакам', () => {
    const margin = orderMargin({ price: 10_000, installerFee: 0, deductionSum: 0 }, [
      consume(1.125, 800),
    ]);

    expect(margin).toEqual({ known: true, materials: 900, value: 9_100 });
  });

  it('🔴 списание без заведённой цены делает маржу неизвестной, а не нулевой', () => {
    const margin = orderMargin(money, [consume(4, 250), consume(2, null)]);

    /* Ноль вместо цены занизил бы расход и завысил маржу — соврал бы ровно в
       ту сторону, ради которой поле и вводится. */
    expect(margin).toEqual({ known: false, unpriced: 1 });
  });

  it('🔴 возврат без цены тоже делает маржу неизвестной', () => {
    /* Пропустить возврат — значит завысить расход и занизить маржу. Врут обе
       стороны, поэтому неизвестной становится вся маржа. */
    const margin = orderMargin(money, [consume(4, 250), back(1, null)]);

    expect(margin).toEqual({ known: false, unpriced: 1 });
  });

  it('называет, сколько движений осталось без цены', () => {
    const margin = orderMargin(money, [consume(1, null), consume(2, 300), back(1, null)]);

    expect(margin).toEqual({ known: false, unpriced: 2 });
  });

  it('🔴 цена ноль — это цена, а не «неизвестно»', () => {
    /* Материал, отданный поставщиком даром, — законное состояние склада, и
       маржа такого наряда считается полностью. */
    const margin = orderMargin(money, [consume(4, 0)]);

    expect(margin).toEqual({ known: true, materials: 0, value: 29_500 });
  });
});

describe('Итог маржи за период', () => {
  it('складывает посчитанные наряды', () => {
    const total = totalMargin([
      { known: true, materials: 1_000, value: 10_000 },
      { known: true, materials: 500, value: 5_000 },
    ]);

    expect(total).toEqual({ value: 15_000, skipped: 0 });
  });

  it('🔴 не выдумывает пропущенные наряды, а считает их отдельно', () => {
    const total = totalMargin([
      { known: true, materials: 1_000, value: 10_000 },
      { known: false, unpriced: 2 },
      { known: false, unpriced: 1 },
    ]);

    /* Итог, умолчавший о пропуске, владелец прочтёт как полный — и решит по
       нему, какую цену ставить. */
    expect(total).toEqual({ value: 10_000, skipped: 2 });
  });

  it('на пустом периоде даёт ноль, а не пустоту', () => {
    expect(totalMargin([])).toEqual({ value: 0, skipped: 0 });
  });
});
