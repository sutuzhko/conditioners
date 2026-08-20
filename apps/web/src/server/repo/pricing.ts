/**
 * Действующая цена товара — docs/TECH_DECISIONS §16, ADR-011.
 *
 * ⚠️ Временная копия: `getActivePrice` по карте владения принадлежит агенту A
 * (`entities/model/lib`). Как только его модуль появится, здесь остаётся
 * реэкспорт: считать скидку двумя разными функциями нельзя.
 *
 * 🔴 Перечёркивается только реально действовавшая цена: `oldPrice` берётся из
 * `priceNum`, процент вычисляется, а не вводится.
 */
export type SalePricing = {
  priceNum: number;
  salePrice: number | null;
  saleFrom: Date | null;
  saleTo: Date | null;
};

export type ActivePrice = {
  currentPrice: number;
  oldPrice: number | null;
  discountPercent: number;
  saleActive: boolean;
};

export function getActivePrice(product: SalePricing, now: Date = new Date()): ActivePrice {
  const { priceNum, salePrice, saleFrom, saleTo } = product;

  const withinPeriod =
    (saleFrom === null || now.getTime() >= saleFrom.getTime()) &&
    (saleTo === null || now.getTime() <= saleTo.getTime());

  // Скидка «вверх» — не скидка: цена, которая выше обычной, не перечёркивает ничего.
  const active = salePrice !== null && salePrice > 0 && salePrice < priceNum && withinPeriod;

  if (!active || salePrice === null) {
    return { currentPrice: priceNum, oldPrice: null, discountPercent: 0, saleActive: false };
  }

  return {
    currentPrice: salePrice,
    oldPrice: priceNum,
    discountPercent: Math.round((1 - salePrice / priceNum) * 100),
    saleActive: true,
  };
}
