import { pageNumber, pageWindow, type Page } from '@/shared/lib/paging';

import type { Product } from '../model';
import { getActivePrice } from './getActivePrice';

/**
 * Отбор, порядок и разбивка каталога — чистые функции над списком моделей
 * (ADR-109).
 *
 * 🔴 Всё живёт в адресе: фильтр, сортировка и номер страницы — параметры
 * запроса, а не состояние компонента. Причины две. Ссылку на отфильтрованный
 * каталог пересылают и сохраняют, и она обязана открываться тем же списком.
 * И страница обязана собираться на сервере (инвариант 1): фильтр на клиенте
 * означал бы, что робот видит либо всё, либо ничего.
 *
 * Имена параметров английские (инвариант 17): `class`, `area`, `sale`,
 * `sort`, `page`.
 *
 * Отбор идёт в памяти, а не запросом в базу. Каталог небольшой — десятки
 * моделей, — и один список даёт и страницу, и набор доступных фильтров, и
 * счётчик найденного, не превращаясь в четыре запроса. Порог, за которым это
 * перестанет быть правдой, — сотни моделей у одного установщика в Туле.
 */

/**
 * Сколько моделей на странице каталога.
 *
 * Своё число, не `ADMIN_PAGE_SIZE`: там восемь карточек списка панели в одну
 * колонку, здесь сетка до четырёх колонок, и восемь оставляли бы вторую
 * страницу почти всегда. Двенадцать — ровно три ряда на десктопе и шесть на
 * планшете.
 */
export const CATALOG_PAGE_SIZE = 12;

/** Имена параметров запроса. Одно место: их знают и страница, и `robots.txt`. */
export const CATALOG_PARAMS = {
  powerClass: 'class',
  area: 'area',
  sale: 'sale',
  sort: 'sort',
  page: 'page',
} as const;

/**
 * Параметры, которые не меняют состав страницы, а только её угол зрения.
 * Из них собирается `Clean-param` для Яндекса и по ним ставится `noindex`.
 * 🔴 `page` сюда не входит: у второй страницы содержимое действительно
 * другое, и склеивать её с первой значит выкинуть из индекса половину
 * ассортимента (ADR-109).
 */
export const CATALOG_NARROWING_PARAMS: readonly string[] = [
  CATALOG_PARAMS.powerClass,
  CATALOG_PARAMS.area,
  CATALOG_PARAMS.sale,
  CATALOG_PARAMS.sort,
];

export const CATALOG_SORTS = ['default', 'price-asc', 'price-desc', 'area-asc'] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export type CatalogFilter = {
  /** Класс мощности: «09». Значение приходит из самих моделей, а не из списка в коде. */
  readonly powerClass: string | null;
  /** Площадь помещения покупателя, м². Подходят модели, которые её потянут. */
  readonly area: number | null;
  /** Только с действующей скидкой. */
  readonly sale: boolean;
};

export type CatalogQuery = {
  readonly filter: CatalogFilter;
  readonly sort: CatalogSort;
  readonly page: number;
};

export const EMPTY_CATALOG_FILTER: CatalogFilter = { powerClass: null, area: null, sale: false };

export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
  filter: EMPTY_CATALOG_FILTER,
  sort: 'default',
  page: 1,
};

/** Что нужно от товара, чтобы отобрать и упорядочить его. Не весь `Product`. */
export type CatalogQueryProduct = Pick<
  Product,
  'badge' | 'areaMax' | 'sort' | 'priceNum' | 'salePrice' | 'saleFrom' | 'saleTo' | 'saleLabel'
>;

/** Значения параметров так, как их отдаёт Next: строка, список или ничего. */
export type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

/** Повторённый параметр — это опечатка в адресе; берём первое значение. */
function single(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function isSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort === value);
}

/**
 * Разбор адреса.
 *
 * Незнакомое значение молча игнорируется, а не отвечает ошибкой: адрес правят
 * руками и присылают друг другу, и пустая страница вместо каталога там ничего
 * не объясняет. Тот же принцип, что у номера страницы в `shared/lib/paging`.
 */
export function parseCatalogQuery(raw: RawSearchParams): CatalogQuery {
  const areaRaw = single(raw[CATALOG_PARAMS.area]);
  const area = Number.parseInt(areaRaw ?? '', 10);
  const sort = single(raw[CATALOG_PARAMS.sort]);

  return {
    filter: {
      powerClass: single(raw[CATALOG_PARAMS.powerClass]) ?? null,
      area: Number.isFinite(area) && area > 0 ? area : null,
      // ровно «1»: булев параметр с тремя написаниями даёт три адреса одной страницы
      sale: single(raw[CATALOG_PARAMS.sale]) === '1',
    },
    sort: isSort(sort) ? sort : 'default',
    page: pageNumber(single(raw[CATALOG_PARAMS.page])),
  };
}

/**
 * Адрес запроса обратно в параметры. Значения по умолчанию не пишутся:
 * `/catalog?sort=default&page=1` — это тот же `/catalog`, и лишний параметр
 * в ссылке, которую кому-то пришлют, ничего не значит.
 */
export function catalogSearchParams(query: CatalogQuery): Record<string, string> {
  const params: Record<string, string> = {};

  if (query.filter.powerClass !== null) params[CATALOG_PARAMS.powerClass] = query.filter.powerClass;
  if (query.filter.area !== null) params[CATALOG_PARAMS.area] = String(query.filter.area);
  if (query.filter.sale) params[CATALOG_PARAMS.sale] = '1';
  if (query.sort !== 'default') params[CATALOG_PARAMS.sort] = query.sort;
  if (query.page > 1) params[CATALOG_PARAMS.page] = String(query.page);

  return params;
}

/**
 * Запрос с изменённым фильтром или порядком.
 *
 * 🔴 Номер страницы сбрасывается: после смены фильтра список другой, и
 * седьмая страница прежнего почти наверняка пуста.
 */
export function withCatalogQuery(
  query: CatalogQuery,
  patch: Partial<CatalogFilter> & { readonly sort?: CatalogSort },
): CatalogQuery {
  const { sort, ...filter } = patch;

  return {
    filter: { ...query.filter, ...filter },
    sort: sort ?? query.sort,
    page: 1,
  };
}

/**
 * Запрос сужен фильтром или сортировкой — значит, это тот же каталог под
 * другим углом, и второй страницей в индексе он не нужен (ADR-109).
 * Пагинация сюда не входит.
 */
export function isNarrowedCatalog(query: CatalogQuery): boolean {
  return (
    query.filter.powerClass !== null ||
    query.filter.area !== null ||
    query.filter.sale ||
    query.sort !== 'default'
  );
}

function matches(product: CatalogQueryProduct, filter: CatalogFilter, now: Date): boolean {
  if (filter.powerClass !== null && product.badge !== filter.powerClass) return false;
  // фильтр по площади помещения: модель обязана её потянуть, а не совпасть с ней
  if (filter.area !== null && product.areaMax < filter.area) return false;
  if (filter.sale && !getActivePrice(product, now).saleActive) return false;
  return true;
}

export function filterCatalog<T extends CatalogQueryProduct>(
  products: readonly T[],
  filter: CatalogFilter,
  now: Date,
): readonly T[] {
  return products.filter((product) => matches(product, filter, now));
}

/**
 * Порядок списка.
 *
 * По умолчанию — порядок владельца (`sort`): он расставляет модели в админке,
 * и подменять его «популярностью», которой мы не измеряем, нечестно.
 * Цена берётся действующая — та, что видна в карточке: сортировка по цене,
 * не совпадающая с ценами на экране, читается как обман.
 */
export function sortCatalog<T extends CatalogQueryProduct>(
  products: readonly T[],
  sort: CatalogSort,
  now: Date,
): readonly T[] {
  const byOwner = (a: T, b: T): number => a.sort - b.sort;
  const price = (product: T): number => getActivePrice(product, now).currentPrice;

  const sorted = products.slice();

  if (sort === 'price-asc') sorted.sort((a, b) => price(a) - price(b) || byOwner(a, b));
  if (sort === 'price-desc') sorted.sort((a, b) => price(b) - price(a) || byOwner(a, b));
  if (sort === 'area-asc') sorted.sort((a, b) => a.areaMax - b.areaMax || byOwner(a, b));
  if (sort === 'default') sorted.sort(byOwner);

  return sorted;
}

/** Из чего вообще есть смысл выбирать: значения берутся из моделей, а не из кода. */
export type CatalogFacets = {
  readonly classes: readonly string[];
  readonly areas: readonly number[];
};

/**
 * Доступные значения фильтров.
 *
 * 🔴 Считаются по всему видимому каталогу, а не по отфильтрованной выборке:
 * иначе выбранный класс мощности убирал бы из ряда все остальные, и вернуться
 * было бы некуда. Классы идут в порядке владельца (`sort`), площади — по
 * возрастанию: это шкала, и любой другой порядок на ней читается как ошибка.
 */
export function catalogFacets(products: readonly CatalogQueryProduct[]): CatalogFacets {
  const ordered = products.slice().sort((a, b) => a.sort - b.sort);

  return {
    classes: [...new Set(ordered.map((product) => product.badge))],
    areas: [...new Set(products.map((product) => product.areaMax))].sort((a, b) => a - b),
  };
}

/**
 * Страница каталога: отбор, порядок и разбивка одним проходом.
 *
 * Границы считает общий `pageWindow`: страница, посчитавшая их по своему
 * размеру, показала бы пустую последнюю (ADR-110).
 */
export function selectCatalogPage<T extends CatalogQueryProduct>(
  products: readonly T[],
  query: CatalogQuery,
  now: Date,
  size: number = CATALOG_PAGE_SIZE,
): Page<T> {
  const found = sortCatalog(filterCatalog(products, query.filter, now), query.sort, now);
  const { page, pages, skip, take } = pageWindow(found.length, query.page, size);

  return { items: found.slice(skip, skip + take), total: found.length, page, pages };
}
