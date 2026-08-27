import type { LeadContextEstimate } from '@/entities/lead/model';
import type {
  InstallRates,
  InstallationEstimate,
  InstallationInput,
  PriceRow,
} from '@/entities/price/model';
import { formatMoney, formatNumber } from '@/shared/lib/format';
import type { SelectOption } from '@/shared/ui';
import {
  classOptionLabel,
  floorBelowLabel,
  floorFromLabel,
  lineLabel,
  meters,
  pricingText,
} from './content';

/**
 * Предел ползунка длины трассы. Это граница интерфейса, а не условие сметы:
 * трассы длиннее в квартире не встречаются, и растянутая до сотни метров шкала
 * сделала бы ползунок неуправляемым. Ставки, метры в базе и порог высотных
 * работ приходят из настроек — их здесь нет и быть не может.
 */
export const TRASSA_MAX_M = 15;

/** Сколько блоков можно посчитать разом. Тоже граница интерфейса: за большим
 *  объёмом идут в заявку, а не в калькулятор. */
export const QTY_MAX = 4;

/** Строки прайса в порядке, заданном владельцем в админке. */
export function sortedRows(rows: readonly PriceRow[]): readonly PriceRow[] {
  return [...rows].sort((a, b) => a.sort - b.sort);
}

/** Классы мощности для выпадающего списка — ровно те, что есть в прайсе. */
export function classOptions(rows: readonly PriceRow[]): readonly SelectOption[] {
  return sortedRows(rows).map((row) => ({
    value: row.cls,
    label: classOptionLabel(row.cls, row.area),
  }));
}

/**
 * Варианты этажа. Порог высотных работ приходит из ставок (ADR-029), поэтому
 * список строится из него, а не из зашитых «1–5 / 6–9 / 10+» прототипа.
 * Значение — номер этажа, который уйдёт в формулу.
 */
export function floorOptions(heightFloorFrom: number): readonly SelectOption[] {
  const high: SelectOption = {
    value: String(heightFloorFrom),
    label: floorFromLabel(heightFloorFrom),
  };

  // порог на первом этаже означает, что высотными считаются любые работы,
  // и вариант «ниже порога» просто не существует
  if (heightFloorFrom <= 1) return [high];

  return [{ value: '1', label: floorBelowLabel(heightFloorFrom) }, high];
}

/** Количество блоков: от одного до предела интерфейса. */
export function qtyOptions(max: number): readonly SelectOption[] {
  return Array.from({ length: Math.max(1, max) }, (_, index) => ({
    value: String(index + 1),
    label: formatNumber(index + 1),
  }));
}

/**
 * Шкала длины трассы. Начинается с метров, входящих в базовую цену: короче
 * трассы не бывает, а на минимуме сразу видно, что включённые метры не
 * тарифицируются.
 */
export function trassaRange(rates: InstallRates, max: number): { min: number; max: number } {
  const min = rates.trassaIncludedM;
  return { min, max: Math.max(max, min + 1) };
}

/** Значение в границах шкалы: пришедшее снаружи не обязано в них попадать. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Этаж приводится к одному из двух вариантов списка: калькулятор различает
 * только «ниже порога» и «с порога», а конкретный номер этажа в формуле не
 * участвует. Иначе переданный снаружи седьмой этаж не совпал бы ни с одним
 * пунктом и список остался бы пустым.
 */
export function normalizeFloor(floor: number, heightFloorFrom: number): number {
  return floor >= heightFloorFrom ? heightFloorFrom : 1;
}

/** Как назван выбранный этаж — тем же словом, что и в списке. */
export function floorLabel(floor: number, heightFloorFrom: number): string {
  return floor >= heightFloorFrom
    ? floorFromLabel(heightFloorFrom)
    : floorBelowLabel(heightFloorFrom);
}

/**
 * Стартовые значения калькулятора. Пришедшие снаружи приводятся к границам
 * шкалы: страница может открыть расчёт на классе, выбранном в каталоге, а
 * история — показать нестандартную смету без единого клика.
 */
export type CalculatorDefaults = {
  readonly cls?: string | undefined;
  readonly trassaM?: number | undefined;
  readonly floor?: number | undefined;
  readonly shtroblenie?: boolean | undefined;
  readonly qty?: number | undefined;
};

export type EstimateContext = {
  /** Класс мощности и площадь — из выбранной строки прайса. */
  readonly cls: string;
  readonly area: string;
  readonly input: InstallationInput;
  readonly estimate: InstallationEstimate;
  readonly rates: InstallRates;
};

/**
 * Расчёт, готовый к переносу в форму заявки. Отдаётся наружу колбэком:
 * форма — чужая зона, блок только готовит текст.
 */
export type EstimateHandoff = EstimateContext & {
  /** Человекочитаемая смета для комментария к заявке. */
  readonly text: string;
};

/**
 * Текст расчёта для заявки. Собирается из тех же подписей и того же
 * `formatMoney`, что и видимая разбивка: менеджер обязан увидеть ровно ту
 * смету, которую человек видел на экране (красная линия «не врать в цене»).
 */
export function buildEstimateText(context: EstimateContext): string {
  const { cls, area, input, estimate, rates } = context;

  const conditions = [
    pricingText.textHeader,
    `${pricingText.textClass}: ${classOptionLabel(cls, area)}`,
    `${pricingText.textTrassa}: ${meters(input.trassaM)}`,
    `${pricingText.textFloor}: ${floorLabel(input.floor, rates.heightFloorFrom)}`,
    `${pricingText.textShtrob}: ${input.shtroblenie ? pricingText.textYes : pricingText.textNo}`,
    `${pricingText.textQty}: ${formatNumber(input.qty)}`,
  ];

  const breakdown = estimate.lines.map(
    (line) =>
      `${lineLabel(line, { cls, heightFloorFrom: rates.heightFloorFrom })} — ${formatMoney(line.amount)}`,
  );

  const totals =
    estimate.qty > 1
      ? [
          `${pricingText.perUnitLabel}: ${formatMoney(estimate.perUnit)}`,
          `${pricingText.textTotal}: ${formatMoney(estimate.total)}`,
        ]
      : [`${pricingText.textTotal}: ${formatMoney(estimate.total)}`];

  return [...conditions, '', ...breakdown, '', ...totals].join('\n');
}

/**
 * Расчёт в виде снимка для заявки.
 *
 * 🔴 Подписи берутся из тех же функций, что рисуют разбивку на экране
 * (`lineLabel`, `classOptionLabel`, `floorLabel`): владелец обязан прочитать в
 * заявке ровно ту смету, которую человек видел, вплоть до формулировки
 * (красная линия «не врать в цене»). Второй словарь на стороне админки
 * разошёлся бы с этим при первой же правке подписи.
 *
 * Цифры уезжают числами, а не текстом: форматирует их показ, и он один на
 * проект — иначе в письме и в панели одна и та же сумма выглядела бы по-разному.
 */
export function toLeadContextEstimate(context: EstimateContext): LeadContextEstimate {
  const { cls, area, input, estimate, rates } = context;

  return {
    params: [
      { label: pricingText.textClass, value: classOptionLabel(cls, area) },
      { label: pricingText.textTrassa, value: meters(input.trassaM) },
      { label: pricingText.textFloor, value: floorLabel(input.floor, rates.heightFloorFrom) },
      {
        label: pricingText.textShtrob,
        value: input.shtroblenie ? pricingText.textYes : pricingText.textNo,
      },
      { label: pricingText.textQty, value: formatNumber(input.qty) },
    ],
    lines: estimate.lines.map((line) => ({
      label: lineLabel(line, { cls, heightFloorFrom: rates.heightFloorFrom }),
      amount: line.amount,
    })),
    // цена за один блок имеет смысл только там, где блоков больше одного
    perUnit: estimate.qty > 1 ? estimate.perUnit : null,
    qty: estimate.qty,
    total: estimate.total,
  };
}
