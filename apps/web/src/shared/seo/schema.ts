import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';

/**
 * Основа сборщиков разметки Schema.org (docs/SEO.md §4).
 *
 * Сборщики — чистые функции: получают данные, отдают узел разметки. Ни один
 * из них не ходит в базу и не знает про `process.env`, поэтому проверяются
 * они обычным тестом без моков, а страница остаётся единственным местом,
 * которое знает, откуда взялись данные.
 *
 * 🔴 Ни одного факта о компании здесь нет и быть не может (инвариант 8):
 * название, телефон, адрес и координаты приходят параметрами из настроек.
 * Нет значения — нет поля: «ТулаКлимат» по умолчанию хуже пустоты, потому
 * что расхождение с Яндекс.Бизнесом бьёт по локальной выдаче.
 */

export type JsonLdPrimitive = string | number | boolean | null;

export type JsonLdValue = JsonLdPrimitive | readonly JsonLdValue[] | JsonLdNode;

export type JsonLdNode = { readonly [key: string]: JsonLdValue | undefined };

/** Валюта прайса. Сайт работает в одном городе одной страны (docs/SEO.md §4). */
export const PRICE_CURRENCY = 'RUB';

const SCHEMA = 'https://schema.org';

export const SCHEMA_CONTEXT = SCHEMA;

/** Значение перечисления Schema.org: `https://schema.org/InStock`. */
export function schemaEnum(name: string): string {
  return `${SCHEMA}/${name}`;
}

/**
 * Строка, годная для разметки.
 *
 * 🔴 Заглушка сидов («ЗАПОЛНИТЕ В АДМИНКЕ») приравнивается к пустоте: пока
 * владелец не заполнил раздел «Компания», в разметке не должно быть ни
 * заглушки, ни выдуманного значения — поля просто нет (инвариант 8).
 */
export function text(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === SETTING_PLACEHOLDER) return undefined;
  return trimmed;
}

/** Список строк без пустот и заглушек. Пустой список — это `undefined`, а не `[]`. */
export function textList(
  values: readonly (string | null | undefined)[] | null | undefined,
): readonly string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const list = values.map(text).filter((v): v is string => v !== undefined);
  return list.length === 0 ? undefined : list;
}

/** Одно значение или массив: Schema.org допускает оба, а лишняя обёртка мешает читать. */
export function oneOrMany(values: readonly string[] | undefined): JsonLdValue | undefined {
  if (values === undefined || values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
}

/** Число, годное для разметки: `NaN` и `Infinity` в JSON превращаются в `null`. */
export function num(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

/**
 * Узел без пустых полей. Пустое поле в разметке хуже отсутствующего: поисковик
 * считает его заявленным и пустым, а не незаполненным.
 */
export function compact(node: JsonLdNode): JsonLdNode {
  const out: Record<string, JsonLdValue> = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Абсолютный адрес: каноникал, `url` и `@id` в разметке обязаны быть полными,
 * относительный путь поисковик приведёт к своему домену (docs/SEO.md §5).
 *
 * Корень отдаётся со слэшем — это его единственная законная форма; остальные
 * пути без завершающего слэша, как требует карта URL (docs/SEO.md §1).
 */
export function absoluteUrl(siteUrl: string, path = '/'): string {
  const base = siteUrl.trim().replace(/\/+$/, '');
  const target = path.trim();

  if (/^https?:\/\//i.test(target)) return target;
  if (target === '' || target === '/') return `${base}/`;

  const withSlash = target.startsWith('/') ? target : `/${target}`;
  return `${base}${withSlash.replace(/\/+$/, '')}`;
}
