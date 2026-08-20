import type { ActivePrice, Product } from '../model';

/** Всё, что нужно для расчёта действующей цены. */
export type SalePricing = Pick<
  Product,
  'priceNum' | 'salePrice' | 'saleFrom' | 'saleTo' | 'saleLabel'
>;

/**
 * 🔴 Границы периода считаются по московскому времени, а не по UTC.
 *
 * Бизнес в Туле: скидка «до 31 октября» обязана заканчиваться в конце дня по
 * местному времени, а не в три часа ночи первого ноября. Пояс фиксированный
 * (+03:00, переходов на летнее время в России нет), поэтому серверный и
 * клиентский рендер по-прежнему считают одинаково — детерминированность
 * никуда не делась.
 */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Начало московских суток, в которые попадает граница. Владелец задаёт период
 * календарными днями, а хранится он мгновением: считаем день от того же
 * смещения, из которого его записали.
 */
function startOfMoscowDay(date: Date, shiftDays = 0): number {
  const local = new Date(date.getTime() + MSK_OFFSET_MS);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + shiftDays);
  return day - MSK_OFFSET_MS;
}

function withinPeriod(now: Date, from: Date | null, to: Date | null): boolean {
  const moment = now.getTime();
  if (from && moment < startOfMoscowDay(from)) return false;
  // граница `saleTo` включительна: скидка действует весь последний день
  if (to && moment >= startOfMoscowDay(to, 1)) return false;
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
