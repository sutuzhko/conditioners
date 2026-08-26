import { describe, expect, it } from 'vitest';

import {
  CATALOG_PAGE_SIZE,
  DEFAULT_CATALOG_QUERY,
  catalogFacets,
  catalogSearchParams,
  filterCatalog,
  isNarrowedCatalog,
  parseCatalogQuery,
  selectCatalogPage,
  sortCatalog,
  withCatalogQuery,
  type CatalogQuery,
  type CatalogQueryProduct,
} from './catalogQuery';

/** Момент расчёта скидки. Фиксированный: иначе тест «протухнет» в день окончания периода. */
const NOW = new Date('2026-08-20T09:00:00.000Z');

function model(overrides: Partial<CatalogQueryProduct> = {}): CatalogQueryProduct {
  return {
    badge: '09',
    areaMax: 25,
    sort: 0,
    priceNum: 38_500,
    salePrice: null,
    saleFrom: null,
    saleTo: null,
    saleLabel: null,
    ...overrides,
  };
}

const small = model({ badge: '07', areaMax: 20, priceNum: 34_900, sort: 0 });
const middle = model({
  badge: '09',
  areaMax: 25,
  priceNum: 38_500,
  salePrice: 33_900,
  saleTo: new Date('2026-10-31T20:59:59.999Z'),
  sort: 1,
});
const large = model({ badge: '12', areaMax: 35, priceNum: 45_200, sort: 2 });

const catalog = [small, middle, large];

describe('Разбор адреса каталога', () => {
  it('пустой адрес — весь каталог в порядке владельца', () => {
    expect(parseCatalogQuery({})).toEqual(DEFAULT_CATALOG_QUERY);
  });

  it('читает класс, площадь, скидку, порядок и страницу', () => {
    const query = parseCatalogQuery({
      class: '09',
      area: '25',
      sale: '1',
      sort: 'price-asc',
      page: '3',
    });

    expect(query).toEqual({
      filter: { powerClass: '09', area: 25, sale: true },
      sort: 'price-asc',
      page: 3,
    });
  });

  it('незнакомый порядок и мусорная площадь не ломают страницу, а игнорируются', () => {
    const query = parseCatalogQuery({ sort: 'по-рейтингу', area: 'много', page: 'вторая' });

    expect(query).toEqual(DEFAULT_CATALOG_QUERY);
  });

  it('повторённый параметр берётся первым значением', () => {
    expect(parseCatalogQuery({ class: ['09', '12'] }).filter.powerClass).toBe('09');
  });

  it('скидка включается только точным «1» — иначе у страницы было бы три адреса', () => {
    expect(parseCatalogQuery({ sale: 'true' }).filter.sale).toBe(false);
    expect(parseCatalogQuery({ sale: '1' }).filter.sale).toBe(true);
  });

  it('собирается обратно в параметры без значений по умолчанию', () => {
    expect(catalogSearchParams(DEFAULT_CATALOG_QUERY)).toEqual({});
    expect(
      catalogSearchParams({
        filter: { powerClass: '09', area: 25, sale: true },
        sort: 'price-desc',
        page: 2,
      }),
    ).toEqual({ class: '09', area: '25', sale: '1', sort: 'price-desc', page: '2' });
  });

  it('разбор и сборка адреса обратны друг другу', () => {
    const params = { class: '12', area: '35', sale: '1', sort: 'area-asc', page: '4' };

    expect(catalogSearchParams(parseCatalogQuery(params))).toEqual(params);
  });

  it('🔴 смена фильтра возвращает на первую страницу', () => {
    const deep: CatalogQuery = { ...DEFAULT_CATALOG_QUERY, page: 7 };

    expect(withCatalogQuery(deep, { powerClass: '09' }).page).toBe(1);
  });
});

describe('Индексируемость запроса', () => {
  it('чистый каталог и любая его страница сужением не считаются', () => {
    expect(isNarrowedCatalog(DEFAULT_CATALOG_QUERY)).toBe(false);
    expect(isNarrowedCatalog({ ...DEFAULT_CATALOG_QUERY, page: 5 })).toBe(false);
  });

  it('🔴 фильтр и сортировка — сужение: тот же каталог под другим углом', () => {
    expect(isNarrowedCatalog(parseCatalogQuery({ class: '09' }))).toBe(true);
    expect(isNarrowedCatalog(parseCatalogQuery({ area: '25' }))).toBe(true);
    expect(isNarrowedCatalog(parseCatalogQuery({ sale: '1' }))).toBe(true);
    expect(isNarrowedCatalog(parseCatalogQuery({ sort: 'price-asc' }))).toBe(true);
  });
});

describe('Отбор моделей', () => {
  it('по классу мощности', () => {
    expect(filterCatalog(catalog, { powerClass: '09', area: null, sale: false }, NOW)).toEqual([
      middle,
    ]);
  });

  it('по площади помещения оставляет модели, которые её потянут', () => {
    const found = filterCatalog(catalog, { powerClass: null, area: 25, sale: false }, NOW);

    expect(found).toEqual([middle, large]);
  });

  it('🔴 скидка считается действующей, а не заявленной', () => {
    const expired = model({
      badge: '24',
      priceNum: 74_500,
      salePrice: 69_900,
      saleTo: new Date('2026-08-18T20:59:59.999Z'),
      sort: 3,
    });

    const found = filterCatalog(
      [...catalog, expired],
      { powerClass: null, area: null, sale: true },
      NOW,
    );

    expect(found).toEqual([middle]);
  });

  it('пустой фильтр ничего не отбрасывает', () => {
    expect(filterCatalog(catalog, DEFAULT_CATALOG_QUERY.filter, NOW)).toEqual(catalog);
  });
});

describe('Порядок каталога', () => {
  it('по умолчанию — порядок владельца', () => {
    expect(sortCatalog([large, small, middle], 'default', NOW)).toEqual([small, middle, large]);
  });

  it('🔴 по цене — по действующей, той же, что видна в карточке', () => {
    const cheapFirst = sortCatalog(catalog, 'price-asc', NOW);

    // 33 900 со скидкой у «09» дешевле 34 900 у «07»
    expect(cheapFirst).toEqual([middle, small, large]);
    expect(sortCatalog(catalog, 'price-desc', NOW)).toEqual([large, small, middle]);
  });

  it('по площади — по возрастанию', () => {
    expect(sortCatalog(catalog, 'area-asc', NOW)).toEqual([small, middle, large]);
  });

  it('не трогает исходный список', () => {
    const source = [large, small];
    sortCatalog(source, 'price-asc', NOW);

    expect(source).toEqual([large, small]);
  });
});

describe('Доступные значения фильтров', () => {
  it('классы идут в порядке владельца, площади — по возрастанию', () => {
    const facets = catalogFacets([large, small, middle]);

    expect(facets.classes).toEqual(['07', '09', '12']);
    expect(facets.areas).toEqual([20, 25, 35]);
  });

  it('повторы схлопываются: два товара одного класса дают один чип', () => {
    const facets = catalogFacets([small, model({ badge: '07', areaMax: 20, sort: 1 })]);

    expect(facets.classes).toEqual(['07']);
    expect(facets.areas).toEqual([20]);
  });

  it('пустой каталог не даёт ни одного фильтра', () => {
    expect(catalogFacets([])).toEqual({ classes: [], areas: [] });
  });
});

describe('Страница каталога', () => {
  const many = Array.from({ length: CATALOG_PAGE_SIZE + 3 }, (_, index) =>
    model({ sort: index, priceNum: 30_000 + index }),
  );

  it('первая страница не длиннее размера страницы, счётчик — по всей выборке', () => {
    const page = selectCatalogPage(many, DEFAULT_CATALOG_QUERY, NOW);

    expect(page.items).toHaveLength(CATALOG_PAGE_SIZE);
    expect(page.total).toBe(many.length);
    expect(page.pages).toBe(2);
    expect(page.page).toBe(1);
  });

  it('вторая страница продолжает первую, не повторяя её', () => {
    const first = selectCatalogPage(many, DEFAULT_CATALOG_QUERY, NOW);
    const second = selectCatalogPage(many, { ...DEFAULT_CATALOG_QUERY, page: 2 }, NOW);

    expect(second.items).toHaveLength(3);
    expect(second.items.some((item) => first.items.includes(item))).toBe(false);
  });

  it('номер за пределами списка прижимается к последней странице', () => {
    const page = selectCatalogPage(many, { ...DEFAULT_CATALOG_QUERY, page: 99 }, NOW);

    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(3);
  });

  it('фильтр считает страницы по найденному, а не по всему каталогу', () => {
    const page = selectCatalogPage(catalog, parseCatalogQuery({ class: '09' }), NOW);

    expect(page.total).toBe(1);
    expect(page.pages).toBe(1);
  });

  it('пустая выборка — это одна пустая страница, а не ноль страниц', () => {
    const page = selectCatalogPage(catalog, parseCatalogQuery({ class: 'нет такого' }), NOW);

    expect(page).toEqual({ items: [], total: 0, page: 1, pages: 1 });
  });
});
