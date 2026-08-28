import type { ProductSpec } from '../model';

/**
 * Справочник характеристик: группы и их поля.
 *
 * Приходит из настроек (`Setting` под ключом `specs`), а не из кода — иначе
 * владелец не смог бы его поправить (инвариант 6, ADR-094).
 */
export type SpecDictionary = {
  readonly groups: readonly {
    readonly title: string;
    readonly fields: readonly {
      readonly k: string;
      /** Единица измерения — подсказка при заполнении, не часть значения. */
      readonly unit?: string | undefined;
      readonly hint?: string | undefined;
    }[];
  }[];
};

export type SpecGroupView = {
  readonly title: string;
  readonly items: readonly { readonly k: string; readonly v: string }[];
};

/** Куда попадают характеристики, которых в справочнике нет. */
export const OTHER_SPECS_TITLE = 'Прочее';

/** Пустой справочник — рабочее состояние: характеристики просто не сгруппированы. */
export const EMPTY_SPEC_DICTIONARY: SpecDictionary = { groups: [] };

type Positioned = { group: number; field: number };

/**
 * Индекс справочника, посчитанный один раз на справочник.
 *
 * 🔴 Без него таблица сравнения работала за «строки × размер справочника»:
 * `specGroupTitle` зовётся на каждой строке и каждый раз пересобирал весь
 * индекс заново. Справочник — неизменяемые данные из настроек, поэтому
 * ответ на нём кешируется целиком; слабая ссылка не держит его в памяти
 * дольше самого справочника.
 */
const indexes = new WeakMap<SpecDictionary, Map<string, Positioned>>();

/**
 * Позиция каждого известного названия: номер группы и номер поля внутри неё.
 *
 * Название, встреченное в справочнике дважды, остаётся за первым вхождением:
 * владелец мог случайно повторить строку, и переносить характеристику в конец
 * из-за опечатки — хуже, чем оставить её на месте.
 */
function positions(dictionary: SpecDictionary): Map<string, Positioned> {
  const cached = indexes.get(dictionary);
  if (cached !== undefined) return cached;

  const map = new Map<string, Positioned>();

  dictionary.groups.forEach((group, groupIndex) => {
    group.fields.forEach((field, fieldIndex) => {
      if (map.has(field.k)) return;
      map.set(field.k, { group: groupIndex, field: fieldIndex });
    });
  });

  indexes.set(dictionary, map);
  return map;
}

/**
 * Разложить характеристики модели по группам справочника.
 *
 * 🔴 Справочник ничего не отбрасывает: характеристика, которой в нём нет,
 * попадает в «Прочее» и остаётся видимой. Иначе владелец, заведя новое поле у
 * одной модели, обнаружил бы, что оно исчезло с сайта, — ровно то, что
 * запрещает инвариант 6.
 *
 * Пустые группы не возвращаются: заголовок без строк — это шум.
 */
export function groupSpecs(
  specs: readonly ProductSpec[],
  dictionary: SpecDictionary = EMPTY_SPEC_DICTIONARY,
  otherTitle: string = OTHER_SPECS_TITLE,
): readonly SpecGroupView[] {
  const known = positions(dictionary);
  const ordered = specs.slice().sort((a, b) => a.sort - b.sort);

  type Bucket = { title: string; items: { k: string; v: string; at: number }[] };

  const buckets: Bucket[] = dictionary.groups.map((group) => ({
    title: group.title,
    items: [],
  }));
  const other: { k: string; v: string }[] = [];

  for (const spec of ordered) {
    const place = known.get(spec.k);
    const bucket = place === undefined ? undefined : buckets[place.group];

    if (place === undefined || bucket === undefined) {
      other.push({ k: spec.k, v: spec.v });
      continue;
    }

    bucket.items.push({ k: spec.k, v: spec.v, at: place.field });
  }

  const groups: SpecGroupView[] = buckets
    .filter((bucket) => bucket.items.length > 0)
    .map((bucket) => ({
      title: bucket.title,
      items: bucket.items
        .slice()
        .sort((a, b) => a.at - b.at)
        .map((item) => ({ k: item.k, v: item.v })),
    }));

  if (other.length > 0) groups.push({ title: otherTitle, items: other });

  return groups;
}

/**
 * Порядок названий по справочнику: сначала известные в порядке справочника,
 * дальше всё остальное в том порядке, в каком оно встретилось.
 *
 * Нужен таблице сравнения: без справочника строки идут в порядке первого
 * появления, то есть в том, в каком владелец заполнял первую попавшуюся
 * модель.
 */
export function orderSpecKeys(
  keys: readonly string[],
  dictionary: SpecDictionary = EMPTY_SPEC_DICTIONARY,
): readonly string[] {
  const known = positions(dictionary);

  return keys
    .map((key, index) => ({ key, index, place: known.get(key) }))
    .sort((a, b) => {
      if (a.place === undefined && b.place === undefined) return a.index - b.index;
      /* Неизвестные — всегда после известных: они и есть «прочее». */
      if (a.place === undefined) return 1;
      if (b.place === undefined) return -1;
      if (a.place.group !== b.place.group) return a.place.group - b.place.group;
      return a.place.field - b.place.field;
    })
    .map((entry) => entry.key);
}

/** Название группы, к которой относится характеристика. `null` — «Прочее». */
export function specGroupTitle(key: string, dictionary: SpecDictionary): string | null {
  const place = positions(dictionary).get(key);
  if (place === undefined) return null;

  return dictionary.groups[place.group]?.title ?? null;
}
