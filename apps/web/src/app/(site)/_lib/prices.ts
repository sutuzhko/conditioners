import type { PriceRow } from '@/entities/price/model';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import type { Product } from '@/entities/product/model';

/**
 * Опорные цифры страниц кластера. 🔴 Все — из данных: цена в заголовке, в
 * описании для выдачи и на странице обязана быть одной и той же, иначе
 * сниппет разойдётся с контентом (инвариант 9, docs/SEO.md §3).
 */

/** Самая дешёвая строка прайса: от неё считается «монтаж от N ₽» и срок работ. */
export function cheapestPriceRow(rows: readonly PriceRow[]): PriceRow | null {
  return rows.reduce<PriceRow | null>(
    (best, row) => (best === null || row.price < best.price ? row : best),
    null,
  );
}

/** Минимальная цена монтажа. Прайс не заведён — `null`, и цифру не показываем. */
export function installPriceFrom(rows: readonly PriceRow[]): number | null {
  return cheapestPriceRow(rows)?.price ?? null;
}

/**
 * Минимальная действующая цена оборудования среди видимых моделей.
 *
 * Считается той же функцией, что рисует цену на витрине: включилась скидка —
 * цена в сниппете выдачи тоже со скидкой, и разойтись они не могут
 * (docs/SEO.md §3, инвариант 9).
 */
export function productPriceFrom(products: readonly Product[], now?: Date): number | null {
  const visible = products.filter((product) => product.visible);
  if (visible.length === 0) return null;

  return visible.reduce(
    (min, product) => Math.min(min, getActivePrice(product, now).currentPrice),
    Infinity,
  );
}
