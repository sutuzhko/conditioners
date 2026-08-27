/**
 * Чеклист выезда — «что взять с собой».
 *
 * 🔴 Собирается из данных наряда, а не пишется руками: тип работ даёт
 * инструмент, каждая позиция — свою трассу и диаметр, штробление добавляет
 * штроборез, высотные работы — страховку, оплата наличными — сумму, которую
 * нужно принять от клиента (docs/CRM.md §3.3).
 *
 * Чистая функция в домене, а не разметка: тот же список нужен и владельцу в
 * панели, и монтажнику на телефоне, и пересборке в репозитории. Второй расчёт
 * в компоненте разошёлся бы с первым на первой же правке.
 */
import { formatMoney } from '@/shared/lib/format';

import type { OrderEquip, OrderType, PaymentMode, UnitSource } from '../model';

/** Позиция наряда в том виде, в каком её читает сборка чеклиста. */
export type ChecklistUnit = {
  readonly equip: OrderEquip;
  readonly model: string | null;
  readonly source: UnitSource;
  readonly trassaM: number | null;
  readonly diameter: string | null;
  readonly shtrob: boolean;
};

/** Наряд глазами чеклиста: только то, из чего он собирается. */
export type ChecklistSource = {
  readonly type: OrderType;
  readonly heightWorks: boolean;
  readonly payment: PaymentMode;
  readonly price: number;
  readonly units: readonly ChecklistUnit[];
};

/**
 * Инструмент по виду работ.
 *
 * Список короткий намеренно: чеклист читают у машины перед выездом, и десять
 * строк на каждый наряд перестают читать целиком уже на второй неделе.
 */
const TOOLS: Readonly<Record<OrderType, readonly string[]>> = {
  install: [
    'Перфоратор с бурами и удлинителем',
    'Вакуумный насос и манометрический коллектор',
    'Труборез, вальцовка и трубогиб',
    'Стремянка',
  ],
  service: [
    'Мойка высокого давления и пакет для чистки',
    'Антибактериальное средство, щётки и ветошь',
    'Стремянка',
  ],
  repair: [
    'Манометрический коллектор и вакуумный насос',
    'Течеискатель и мультиметр',
    'Баллон с хладагентом',
  ],
};

const SHTROB_LINE = 'Штроборез, диски и строительный пылесос';

/** Про безопасность, а не про удобство: строка обязана быть в списке дословно. */
const HEIGHT_LINE = 'Страховочная система и каска: работы на высоте';

const UNKNOWN_UNIT_LINE = 'уточнить трассу и диаметр на объекте';

function unitLabel(unit: ChecklistUnit, index: number): string {
  const number = `Позиция ${index + 1}`;
  return unit.model === null || unit.model === '' ? number : `${number}, ${unit.model}`;
}

/**
 * Что нужно по позиции: наше оборудование сначала забирают со склада, дальше
 * идут материалы трассы.
 *
 * Позиция клиента строки «забрать со склада» не даёт: там везут только
 * работы, а блок уже стоит в квартире (docs/CRM.md §3.3).
 */
function unitLines(unit: ChecklistUnit, index: number): readonly string[] {
  const label = unitLabel(unit, index);
  const lines: string[] = [];

  if (unit.source === 'ours') lines.push(`Забрать со склада — ${label}`);

  const trassa = unit.trassaM === null ? null : `медная трасса ${unit.trassaM} м`;
  const diameter =
    unit.diameter === null || unit.diameter === '' ? null : `диаметр ${unit.diameter}`;
  const parts = [trassa, diameter].filter((part): part is string => part !== null);

  /* Позиция без трассы и диаметра — это не повод её пропустить: на объект
     всё равно едут, и незаданные размеры выясняют там. Строка об этом
     полезнее молчания. */
  lines.push(`${label}: ${parts.length === 0 ? UNKNOWN_UNIT_LINE : parts.join(', ')}`);

  return lines;
}

/** Повторы убираются: чеклист сверяют по тексту, и два одинаковых пункта в нём лишние. */
function unique(lines: readonly string[]): readonly string[] {
  return [...new Set(lines)];
}

/**
 * Пункты чеклиста в порядке сборов: сначала оборудование и материалы, потом
 * инструмент, потом безопасность, и в конце деньги.
 */
export function buildChecklist(order: ChecklistSource): readonly string[] {
  const lines: string[] = [];

  for (const [index, unit] of order.units.entries()) lines.push(...unitLines(unit, index));

  lines.push(...TOOLS[order.type]);

  if (order.units.some((unit) => unit.shtrob)) lines.push(SHTROB_LINE);
  if (order.heightWorks) lines.push(HEIGHT_LINE);

  /* 🔴 Сумма прописью в чеклисте — не украшение: при оплате наличными её
     принимают на объекте, и монтажник обязан знать её до выезда. */
  if (order.payment === 'cash_to_installer' && order.price > 0) {
    lines.push(`Принять от клиента ${formatMoney(order.price)}`);
  }

  return unique(lines);
}

// ---------- Пересборка ----------

/** Сохранённый пункт в том виде, в каком его читает пересборка. */
export type ChecklistItemLike = {
  readonly id: string;
  readonly text: string;
  /** Дописан человеком: пересборка такой пункт не трогает. */
  readonly own: boolean;
};

export type ChecklistPlan = {
  /** Пункт остаётся вместе со своей отметкой; меняется только порядок. */
  readonly keep: readonly { readonly id: string; readonly sort: number }[];
  readonly create: readonly { readonly text: string; readonly sort: number }[];
  readonly remove: readonly string[];
};

/**
 * 🔴 Пересборка не стирает ни дописанное человеком, ни отметки при сборах.
 *
 * Собранный пункт узнаётся по тексту: тот, что остался в наряде, сохраняет
 * `done` и свой номер записи, исчезнувший — удаляется, новый — заводится.
 * Иначе монтажник, отметивший половину списка, после правки наряда владельцем
 * получал бы чистый лист и собирался заново.
 *
 * Пункты человека уходят в конец: они дописаны к собранному списку, а не
 * вместо него, и их порядок между собой сохраняется.
 */
export function planChecklist(
  generated: readonly string[],
  existing: readonly ChecklistItemLike[],
): ChecklistPlan {
  const own = existing.filter((item) => item.own);
  const built = existing.filter((item) => !item.own);

  const keep: { id: string; sort: number }[] = [];
  const create: { text: string; sort: number }[] = [];
  const used = new Set<string>();

  for (const [sort, text] of generated.entries()) {
    const found = built.find((item) => item.text === text && !used.has(item.id));

    if (found === undefined) {
      create.push({ text, sort });
      continue;
    }

    used.add(found.id);
    keep.push({ id: found.id, sort });
  }

  for (const [index, item] of own.entries()) {
    keep.push({ id: item.id, sort: generated.length + index });
  }

  return {
    keep,
    create,
    remove: built.filter((item) => !used.has(item.id)).map((item) => item.id),
  };
}
