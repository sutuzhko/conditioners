import { z } from 'zod';

/**
 * Цены монтажа и ставки допработ.
 *
 * Все цифры приходят из БД: формула калькулятора меняется правкой ставок в
 * админке, а не правкой коэффициента в коде (красные линии в docs/CLAUDE.md).
 */

/**
 * Класс мощности — строка, а не перечисление: владелец вправе завести класс
 * «24» из админки, и калькулятор с таблицей цен обязаны это пережить без
 * разработчика (PROJECT §4).
 */
export const powerClassSchema = z.string().trim().min(1);

/** Строка таблицы цен на монтаж: класс, мощность, площадь, цена, срок работ. */
export const priceRowSchema = z.object({
  cls: powerClassSchema,
  power: z.string().trim().min(1),
  area: z.string().trim().min(1),
  price: z.number().int().nonnegative(),
  term: z.string().trim().min(1),
  sort: z.number().int().default(0),
});

export type PriceRow = z.infer<typeof priceRowSchema>;

/**
 * Ставки допработ — группа настроек `extras`.
 *
 * `trassaIncludedM` и `heightFloorFrom` в исходных сидах отсутствуют, поэтому
 * заданы значениями по умолчанию из PROJECT §2.4: три метра трассы входят в
 * базу, высотные работы начинаются с десятого этажа. Они вынесены в настройки
 * по той же причине, что и ставки: это условия сметы, а не константы кода.
 */
export const installRatesSchema = z.object({
  trassaPerM: z.number().nonnegative(),
  shtrobPerM: z.number().nonnegative(),
  heightWorks: z.number().nonnegative(),
  trassaIncludedM: z.number().nonnegative().default(3),
  heightFloorFrom: z.number().int().positive().default(10),
});

export type InstallRates = z.infer<typeof installRatesSchema>;

/** Ввод калькулятора. `basePrice` — цена монтажа выбранного класса из `PriceRow`. */
export const installationInputSchema = z.object({
  basePrice: z.number().nonnegative(),
  trassaM: z.number().nonnegative(),
  floor: z.number().int().positive(),
  shtroblenie: z.boolean(),
  qty: z.number().int().positive(),
});

export type InstallationInput = z.infer<typeof installationInputSchema>;

/**
 * Слагаемое сметы. Строк с нулевой суммой в разбивке нет: калькулятор
 * показывает, из чего сложилась цена, а не перечень неоказанных услуг.
 * Подписи слагаемых живут в UI — домен отдаёт только `kind` и цифры.
 */
export type InstallationLine =
  | { readonly kind: 'base'; readonly amount: number }
  | {
      readonly kind: 'trassa';
      readonly meters: number;
      readonly rate: number;
      readonly amount: number;
    }
  | { readonly kind: 'height'; readonly amount: number }
  | {
      readonly kind: 'shtroblenie';
      readonly meters: number;
      readonly rate: number;
      readonly amount: number;
    };

export type InstallationEstimate = {
  /** Разбивка по слагаемым — за один блок. */
  readonly lines: readonly InstallationLine[];
  /** Сумма за один блок. */
  readonly perUnit: number;
  readonly qty: number;
  /** Итог за всё количество. */
  readonly total: number;
};
