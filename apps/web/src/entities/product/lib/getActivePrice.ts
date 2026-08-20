import type { ActivePrice, Product } from '../model';

/** Всё, что нужно для расчёта действующей цены. */
export type SalePricing = Pick<
  Product,
  'priceNum' | 'salePrice' | 'saleFrom' | 'saleTo' | 'saleLabel'
>;

/**
 * Границы периода считаются в UTC — так же, как форматируются даты
 * (`shared/lib/format`). Период задаётся календарной датой и хранится как
 * полночь UTC; считать его в поясе читателя нельзя, иначе серверный и
 * клиентский рендер разойдутся на сутки.
 */
function startOfUtcDay(date: Date, shiftDays = 0): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + shiftDays);
}

function withinPeriod(now: Date, from: Date | null, to: Date | null): boolean {
  const moment = now.getTime();
  if (from && moment < startOfUtcDay(from)) return false;
  // граница `saleTo` включительна: скидка действует весь последний день
  if (to && moment >= startOfUtcDay(to, 1)) return false;
  return true;
}

const NO_SALE = (product: SalePricing): ActivePrice => ({
  currentPrice: product.priceNum,
  oldPrice: null,
  discountPercent: null,
  saleActive: false,
  saleLabel: null,
  saleTo: null,
});

/**
 * Действующая цена со скидкой (PROJECT §2.8, ADR-011).
 *
 * Скидка активна, если задана конечная цена и текущий момент внутри периода;
 * пустая граница периода означает «без ограничения». Окончание периода
 * снимает скидку само, без участия владельца.
 *
 * 🔴 Цена со скидкой, не меньшая обычной, скидкой не считается: перечёркивать
 * можно только цену, по которой товар действительно продавался (инвариант 14).
 *
 * Одна функция на карточку, каталог, разметку и калькулятор — чтобы цена в
 * трёх местах не разошлась.
 */
export function getActivePrice(product: SalePricing, now: Date = new Date()): ActivePrice {
  const { priceNum, salePrice } = product;

  if (salePrice === null || salePrice <= 0 || salePrice >= priceNum) return NO_SALE(product);
  if (!withinPeriod(now, product.saleFrom, product.saleTo)) return NO_SALE(product);

  return {
    currentPrice: salePrice,
    oldPrice: priceNum,
    discountPercent: Math.round((1 - salePrice / priceNum) * 100),
    saleActive: true,
    saleLabel: product.saleLabel,
    saleTo: product.saleTo,
  };
}
