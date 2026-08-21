/** Отправка прайса — контракт docs/API.md §4. */
import { pricesFormContent as texts } from './content';
import type { PricesFormValues, PricesSaveResult } from './model';

export function toRequestBody(values: PricesFormValues): Record<string, unknown> {
  return {
    prices: values.prices
      /* Пустая строка — это забытый ряд, а не класс мощности: на сайте он
         стал бы строкой прайса без цены. */
      .filter((row) => row.cls.trim() !== '')
      .map((row) => ({
        cls: row.cls.trim(),
        power: row.power.trim(),
        area: row.area.trim(),
        price: row.price,
        term: row.term.trim(),
      })),
    extras: { ...values.extras },
  };
}

export async function putPrices(values: PricesFormValues): Promise<PricesSaveResult> {
  try {
    const response = await fetch('/api/admin/prices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequestBody(values)),
    });

    if (response.ok) return { ok: true };

    const payload: unknown = await response.json().catch(() => null);
    const error = (payload as { error?: { message?: unknown } } | null)?.error;

    return {
      ok: false,
      message: typeof error?.message === 'string' ? error.message : texts.serverError,
    };
  } catch {
    return { ok: false, message: texts.networkError };
  }
}
