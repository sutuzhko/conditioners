/** Разбор формы скидки и отправка — контракт docs/API.md §3. */
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import type { ActivePrice } from '@/entities/product/model';

import { productSaleContent as texts } from './content';
import type { SaleFormValues, SaleResult } from './model';

/** Дата из поля `type="date"`: пусто — граница не задана. */
function toDate(value: string): Date | null {
  if (value.trim() === '') return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPrice(value: string): number | null {
  if (value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

/**
 * Что покажет сайт при этих значениях.
 *
 * 🔴 Считается той же функцией, что и на витрине, а не своей формулой: иначе
 * владелец увидит один процент, а посетитель — другой, и разойдутся ещё и
 * цифры в разметке (инвариант 9).
 */
export function previewSale(
  values: SaleFormValues,
  priceNum: number,
  now = new Date(),
): ActivePrice {
  return getActivePrice(
    {
      priceNum,
      salePrice: toPrice(values.salePrice),
      saleFrom: toDate(values.saleFrom),
      saleTo: toDate(values.saleTo),
      saleLabel: values.saleLabel.trim() === '' ? null : values.saleLabel.trim(),
    },
    now,
  );
}

/**
 * Почему скидка не появится, хотя цена задана.
 *
 * Не ошибка формы: такие значения сервер примет. Но промолчать нельзя —
 * владелец решит, что скидка идёт, а на сайте её не будет.
 */
export function explainInactive(values: SaleFormValues, priceNum: number): string | null {
  const salePrice = toPrice(values.salePrice);
  if (salePrice === null) return null;

  if (salePrice >= priceNum) return texts.priceTooHigh;

  const from = toDate(values.saleFrom);
  const to = toDate(values.saleTo);
  if (from !== null && to !== null && to.getTime() < from.getTime()) return texts.periodBackwards;

  return null;
}

export function toSaleBody(values: SaleFormValues): Record<string, unknown> {
  const optional = (value: string): string | undefined =>
    value.trim() === '' ? undefined : value.trim();

  return {
    salePrice: toPrice(values.salePrice),
    ...(optional(values.saleFrom) === undefined ? {} : { saleFrom: values.saleFrom }),
    ...(optional(values.saleTo) === undefined ? {} : { saleTo: values.saleTo }),
    saleLabel: optional(values.saleLabel) ?? null,
  };
}

export async function patchSale(productId: string, values: SaleFormValues): Promise<SaleResult> {
  try {
    const response = await fetch(`/api/admin/models/${productId}/sale`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSaleBody(values)),
    });

    if (response.ok) return { ok: true };

    const payload: unknown = await response.json().catch(() => null);
    const error = (payload as { error?: { message?: unknown } } | null)?.error;
    const message = typeof error?.message === 'string' ? error.message : texts.serverError;

    return { ok: false, message };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}
