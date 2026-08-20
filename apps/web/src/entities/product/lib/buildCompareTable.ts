import type { Product } from '../model';

/** Сравнению нужны имя, характеристики и видимость. */
export type ComparableProduct = Pick<Product, 'specs' | 'visible'>;

export type CompareRow = {
  readonly key: string;
  /** Значения в порядке колонок; отсутствующее заменено прочерком. */
  readonly values: readonly string[];
};

export type CompareTable<T> = {
  /** Колонки — видимые модели во входном порядке. */
  readonly products: readonly T[];
  /** Строки — объединение ключей `specs` в порядке первого появления. */
  readonly rows: readonly CompareRow[];
};

/** Типографский прочерк. Вынесен в параметр, чтобы не зашивать символ в домен. */
const EM_DASH = '—';

/**
 * Таблица сравнения — объединение ключей `specs` всех видимых моделей
 * (инвариант 6, ADR-015).
 *
 * 🔴 Никакого фиксированного набора характеристик: владелец добавляет модель с
 * характеристикой «Wi-Fi управление» — таблица сама вырастает на строку.
 * Порядок строк — порядок первого появления ключа, порядок колонок — входной
 * (репозиторий отдаёт модели уже отсортированными).
 */
export function buildCompareTable<T extends ComparableProduct>(
  products: readonly T[],
  placeholder: string = EM_DASH,
): CompareTable<T> {
  const columns = products.filter((p) => p.visible);

  // Map хранит порядок вставки — это и есть «порядок первого появления».
  const byKey = new Map<string, Map<number, string>>();

  columns.forEach((product, column) => {
    const specs = product.specs.slice().sort((a, b) => a.sort - b.sort);
    for (const spec of specs) {
      const row = byKey.get(spec.k) ?? new Map<number, string>();
      // Дубль ключа внутри одной модели: остаётся первое значение владельца.
      if (!row.has(column)) row.set(column, spec.v);
      byKey.set(spec.k, row);
    }
  });

  const rows = [...byKey.entries()].map(([key, values]) => ({
    key,
    values: columns.map((_, column) => values.get(column) ?? placeholder),
  }));

  return { products: columns, rows };
}
