import type { InstallRates, InstallationLine } from '@/entities/price/model';
import { formatMoney, formatNumber } from '@/shared/lib/format';

/**
 * Подписи блока «Цены на монтаж».
 *
 * Текст отделён от разметки (docs/CLAUDE.md, «Контент»): его правят чаще, чем
 * вёрстку.
 *
 * 🔴 Ни одной цифры сметы здесь нет. Метры, входящие в базовый монтаж, порог
 * высотных работ и ставки допработ приходят из настроек (ADR-029), поэтому
 * тексты, где они встречаются, — функции от ставок, а не строки.
 */
export const pricingText = {
  kicker: '— Цены на монтаж —',
  title: 'Стоимость установки кондиционера',
  lead: 'Базовый монтаж — кронштейны, медная трасса, вакуумация и запуск под ключ. Смета фиксируется до начала работ.',

  colPower: 'Мощность / площадь',
  colPrice: 'Монтаж под ключ',
  colTerm: 'Срок',
  tableCaption: 'Цены на монтаж по классам мощности',

  ratesNoteTail: 'Точную стоимость подтвердит специалист по телефону.',

  emptyTitle: 'Прайс пока не заполнен',
  emptyText:
    'Цены на монтаж появятся здесь, как только их заведут в админ-панели. Стоимость по вашему адресу назовём по телефону — оставьте заявку.',

  calcTitle: 'Калькулятор монтажа',
  calcBadge: 'ОНЛАЙН-РАСЧЁТ',
  calcOffTitle: 'Онлайн-расчёт временно недоступен',
  calcOffText:
    'Ставки на дополнительные работы ещё не заданы. Считать смету наугад мы не будем — стоимость допработ назовёт специалист по телефону.',

  fieldClass: 'Класс мощности',
  fieldTrassa: 'Длина трассы',
  fieldFloor: 'Этаж',
  fieldQty: 'Количество блоков',

  breakdownTitle: 'Из чего складывается',
  perUnitLabel: 'За один блок',
  totalLabel: 'Итого за монтаж',
  apply: 'Зафиксировать в заявке',

  textHeader: 'Расчёт монтажа с сайта',
  textClass: 'Класс мощности',
  textTrassa: 'Длина трассы',
  textFloor: 'Этаж',
  textShtrob: 'Штробление',
  textQty: 'Количество блоков',
  textYes: 'да',
  textNo: 'нет',
  textTotal: 'Итого',
} as const;

/** «7 м» — длина трассы. Единица измерения, а не условие сметы. */
export function meters(value: number): string {
  return `${formatNumber(value)} м`;
}

/**
 * «700 ₽/м» — ставка за метр. Сама ставка приходит из настроек.
 *
 * После дроби стоит невидимый word joiner: без него строка рвётся между «₽/»
 * и «м», и в подписи чекбокса на телефоне остаётся висячее «м)».
 */
export function perMeter(rate: number): string {
  return `${formatMoney(rate)}/\u2060м`;
}

/** «от 6 000 ₽» — цена монтажа в таблице: она стартовая, а не окончательная. */
export function priceFrom(price: number): string {
  return `от ${formatMoney(price)}`;
}

/** Пункт выпадающего списка классов: «09 · до 27 м²». Обе части — из прайса. */
export function classOptionLabel(cls: string, area: string): string {
  return `${cls} · ${area}`;
}

/** Этажи ниже порога высотных работ: «1–9». */
export function floorBelowLabel(heightFloorFrom: number): string {
  return `1–${formatNumber(heightFloorFrom - 1)}`;
}

/** Этажи, с которых начинаются высотные работы: «10+». */
export function floorFromLabel(heightFloorFrom: number): string {
  return `${formatNumber(heightFloorFrom)}+`;
}

/** Подсказка под выбором этажа: с какого этажа считаются высотные работы. */
export function floorHint(heightFloorFrom: number): string {
  return `Высотные работы — с ${formatNumber(heightFloorFrom)} этажа`;
}

/** Подпись чекбокса штробления вместе с действующей ставкой. */
export function shtrobLabel(rate: number): string {
  return `Штробление стен под трассу (+${perMeter(rate)})`;
}

/** «× 2» рядом с ценой за один блок. */
export function qtyMultiplier(qty: number): string {
  return `× ${formatNumber(qty)}`;
}

/**
 * Подпись слагаемого сметы. Домен отдаёт `kind`, метры и ставку — как это
 * назвать, решает блок. Функция одна на разбивку в вёрстке и на текст расчёта,
 * который уезжает в заявку: в цене нельзя расходиться даже формулировкой.
 */
export function lineLabel(
  line: InstallationLine,
  context: { readonly cls: string; readonly heightFloorFrom: number },
): string {
  switch (line.kind) {
    case 'base':
      return `Базовый монтаж, класс ${context.cls}`;
    case 'trassa':
      return `Трасса сверх включённой, ${meters(line.meters)} × ${perMeter(line.rate)}`;
    case 'height':
      return `Высотные работы, этаж ${formatNumber(context.heightFloorFrom)} и выше`;
    case 'shtroblenie':
      return `Штробление, ${meters(line.meters)} × ${perMeter(line.rate)}`;
  }
}

/**
 * Условия сметы под таблицей: что входит в базовую цену и сколько стоит
 * остальное. Ставка, равная нулю, в список не попадает — это не «бесплатно»,
 * а «не тарифицируется», и обещать в прайсе нечего.
 */
export function ratesNote(rates: InstallRates): readonly string[] {
  const note: string[] = [];

  if (rates.trassaIncludedM > 0) {
    note.push(`Трасса до ${meters(rates.trassaIncludedM)} — в базовой цене`);
  }
  if (rates.trassaPerM > 0) {
    note.push(`Дополнительная трасса — ${perMeter(rates.trassaPerM)}`);
  }
  if (rates.shtrobPerM > 0) {
    note.push(`Штробление — ${perMeter(rates.shtrobPerM)}`);
  }
  if (rates.heightWorks > 0) {
    note.push(
      `Высотные работы с ${formatNumber(rates.heightFloorFrom)} этажа — ${formatMoney(rates.heightWorks)}`,
    );
  }

  return note;
}
