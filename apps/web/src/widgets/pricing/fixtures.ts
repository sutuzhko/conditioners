import type { PriceRow } from '@/entities/price/model';
import { installRatesSchema } from '@/entities/price/model';

/**
 * Фикстуры блока «Цены». Питают stories (в Storybook базы нет и быть не может)
 * и тесты, а заодно документируют, какие данные блок ждёт от страницы
 * (docs/ORCHESTRATION.md).
 *
 * 🔴 Это демонстрационный прайс, а не действующие цены: настоящие ставки и
 * строки владелец заводит в админке.
 */
function row(cls: string, power: string, area: string, price: number, term: string): PriceRow {
  return { cls, power, area, price, term, sort: Number(cls) };
}

const row07 = row('07', '2.0 кВт', 'до 20 м²', 5_500, '3–4 часа');
const row09 = row('09', '2.6 кВт', 'до 27 м²', 6_000, '3–4 часа');
const row12 = row('12', '3.5 кВт', 'до 35 м²', 6_500, '4 часа');
const row18 = row('18', '5.3 кВт', 'до 50 м²', 8_000, '4–5 часов');

/** Полный прайс: четыре класса мощности в порядке возрастания. */
export const priceRows: readonly PriceRow[] = [row07, row09, row12, row18];

/** Ставки со значениями по умолчанию из схемы: три метра в базе, порог — 10 этаж. */
export const rates = installRatesSchema.parse({
  trassaPerM: 700,
  shtrobPerM: 800,
  heightWorks: 2_000,
});

/**
 * Другие условия сметы: пять метров трассы в базе и высотные работы с шестого
 * этажа. Ими проверяется, что ни одна из этих цифр не зашита в блок.
 */
export const customRates = installRatesSchema.parse({
  trassaPerM: 550,
  shtrobPerM: 900,
  heightWorks: 2_500,
  trassaIncludedM: 5,
  heightFloorFrom: 6,
});

/** Прайс из одной строки: владелец завёл только один класс. */
export const singleRow: readonly PriceRow[] = [row09];
