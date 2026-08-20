import { describe, expect, it } from 'vitest';

import { buildCompareTable, type ComparableProduct } from './buildCompareTable';

type Model = ComparableProduct & { readonly name: string };

const spec = (k: string, v: string, sort = 0) => ({ k, v, sort });

describe('buildCompareTable', () => {
  it('объединяет ключи в порядке первого появления', () => {
    const products: Model[] = [
      {
        name: '07',
        visible: true,
        specs: [spec('Площадь', 'до 20 м²', 0), spec('Уровень шума', '19 дБ', 1)],
      },
      {
        name: '09',
        visible: true,
        specs: [spec('Уровень шума', '21 дБ', 0), spec('Wi-Fi управление', 'есть', 1)],
      },
    ];

    expect(buildCompareTable(products).rows.map((r) => r.key)).toEqual([
      'Площадь',
      'Уровень шума',
      'Wi-Fi управление',
    ]);
  });

  it('новая характеристика у одной модели растит таблицу на строку', () => {
    const products: Model[] = [
      { name: '07', visible: true, specs: [spec('Площадь', 'до 20 м²')] },
      {
        name: '09',
        visible: true,
        specs: [spec('Площадь', 'до 27 м²', 0), spec('Wi-Fi управление', 'есть', 1)],
      },
    ];

    const table = buildCompareTable(products);

    expect(table.rows).toHaveLength(2);
    expect(table.rows[1]).toEqual({ key: 'Wi-Fi управление', values: ['—', 'есть'] });
  });

  it('отсутствующее значение — прочерк, и его можно заменить', () => {
    const products: Model[] = [
      { name: '07', visible: true, specs: [spec('Площадь', 'до 20 м²')] },
      { name: '09', visible: true, specs: [spec('Компрессор', 'инвертор')] },
    ];

    expect(buildCompareTable(products).rows[0]?.values).toEqual(['до 20 м²', '—']);
    expect(buildCompareTable(products, 'нет').rows[0]?.values).toEqual(['до 20 м²', 'нет']);
  });

  it('скрытые модели не становятся колонками', () => {
    const products: Model[] = [
      { name: '07', visible: true, specs: [spec('Площадь', 'до 20 м²')] },
      { name: 'скрытая', visible: false, specs: [spec('Секрет', 'да')] },
    ];

    const table = buildCompareTable(products);

    expect(table.products).toHaveLength(1);
    expect(table.rows.map((r) => r.key)).toEqual(['Площадь']);
  });

  it('модель без характеристик даёт колонку из прочерков', () => {
    const products: Model[] = [
      { name: '07', visible: true, specs: [spec('Площадь', 'до 20 м²')] },
      { name: 'без характеристик', visible: true, specs: [] },
    ];

    const table = buildCompareTable(products);

    expect(table.products).toHaveLength(2);
    expect(table.rows[0]?.values).toEqual(['до 20 м²', '—']);
  });

  it('характеристики внутри модели идут в порядке sort', () => {
    const products: Model[] = [
      {
        name: '07',
        visible: true,
        specs: [spec('Компрессор', 'on/off', 2), spec('Площадь', 'до 20 м²', 0)],
      },
    ];

    expect(buildCompareTable(products).rows.map((r) => r.key)).toEqual(['Площадь', 'Компрессор']);
  });

  it('пустой список моделей — пустая таблица, а не набор колонок по умолчанию', () => {
    expect(buildCompareTable([])).toEqual({ products: [], rows: [] });
  });

  it('ни одна модель без характеристик — строк нет', () => {
    const products: Model[] = [{ name: '07', visible: true, specs: [] }];

    expect(buildCompareTable(products).rows).toEqual([]);
  });
});
