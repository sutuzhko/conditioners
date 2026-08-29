/** Отправка прайса — контракт docs/API.md §4. */
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { pricesFormContent as texts } from './content';
import type { PriceRowValues, PricesFormValues, PricesSaveResult } from './model';

/** Есть ли в строке хоть что-нибудь, кроме пробелов. */
function rowFilled(row: PriceRowValues): boolean {
  return [row.cls, row.power, row.area, row.price, row.term].some((cell) => cell.trim() !== '');
}

/**
 * 🔴 Строка без класса — потерянная строка, а не пустой ряд.
 *
 * Отбрасывались обе одинаково, фильтром по `cls`. Ряд, куда владелец вписал
 * площадь и цену, но не заполнил класс, исчезал при отправке без единого
 * слова: человек видел «Сохранено» и уходил. Это не правило разработки, это
 * обещание «не врать в цене».
 *
 * Совсем пустой ряд отбрасывается по-прежнему и молча: его добавляет кнопка
 * «Добавить строку», и незаполненный он означает «передумал», а не потерю.
 *
 * Возвращается адрес строки и текст: форма подсвечивает свою ячейку, а не
 * показывает одну плашку на таблицу из десяти классов.
 */
export function rowsWithoutClass(values: PricesFormValues): readonly number[] {
  return values.prices.reduce<number[]>((found, row, index) => {
    if (row.cls.trim() === '' && rowFilled(row)) found.push(index);
    return found;
  }, []);
}

export function toRequestBody(values: PricesFormValues): Record<string, unknown> {
  return {
    prices: values.prices
      /* Совсем пустой ряд не отправляется: на сайте он стал бы строкой прайса
         без цены. Ряд, где есть данные, но нет класса, сюда не доходит —
         форма останавливает отправку и подсвечивает его (`rowsWithoutClass`). */
      .filter(rowFilled)
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

/**
 * Адрес строки из ответа сервера: `prices.3.cls` → 3.
 *
 * `null` — отказ не про строку прайса (ставки допуслуг, общий отказ). Разбор
 * живёт здесь, а не в компоненте: это формат контракта, а не вёрстка.
 */
export function rowOfField(field: string | undefined): number | null {
  if (field === undefined) return null;

  const match = /^prices\.(\d+)(?:\.|$)/.exec(field);
  if (match === null) return null;

  const index = Number(match[1]);
  return Number.isSafeInteger(index) ? index : null;
}

export async function putPrices(values: PricesFormValues): Promise<PricesSaveResult> {
  // Общий разбор ответа (ADR-030): свои остаются только формулировки фичи.
  const result = await adminRequest('/api/admin/prices', jsonInit('PUT', toRequestBody(values)), {
    ...ADMIN_API_TEXTS,
    network: texts.networkError,
    server: texts.serverError,
  });

  if (result.ok) return { ok: true };

  // поле пробрасывается как есть: разбирает его форма через `rowOfField`
  return {
    ok: false,
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}
