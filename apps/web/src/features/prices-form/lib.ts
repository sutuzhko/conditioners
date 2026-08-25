/** Отправка прайса — контракт docs/API.md §4. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

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
  // Общий разбор ответа (ADR-030): свои остаются только формулировки фичи.
  const result = await adminRequest('/api/admin/prices', jsonInit('PUT', toRequestBody(values)), {
    ...ADMIN_API_TEXTS,
    network: texts.networkError,
    server: texts.serverError,
  });

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
