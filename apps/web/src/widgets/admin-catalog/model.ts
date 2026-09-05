/**
 * Отбор каталога в панели.
 *
 * 🔴 Условия живут в адресе, а не в состоянии компонента (ADR-105): страницу
 * с найденным можно оставить в закладках и прислать себе, а «назад» браузера
 * возвращает к прошлому списку. Своего JavaScript у отбора поэтому нет
 * вовсе — обычная форма `method="get"` и ссылки разбивки (issue #612).
 */
import { CATALOG_PATH } from '@/features/product-form';

/** Что показывает список: только видимые модели, только скрытые или все. */
export const CATALOG_VISIBILITIES = ['visible', 'hidden'] as const;
export type CatalogVisibility = (typeof CATALOG_VISIBILITIES)[number];

/** Что выбрано сейчас. Пустая строка и `undefined` означают «условия нет». */
export type CatalogFilter = {
  readonly query: string;
  readonly visibility: CatalogVisibility | undefined;
};

/** Параметры адреса раздела — ровно то, что приходит в `searchParams`. */
export type CatalogSearchParams = {
  readonly q?: string | undefined;
  readonly show?: string | undefined;
  readonly page?: string | undefined;
};

/**
 * Отбор из адреса.
 *
 * Мусор в параметре снимает условие, а не роняет раздел: адрес правят руками
 * и присылают друг другу, и отказ вместо каталога там ничего не объясняет.
 */
export function catalogFilterOf(params: CatalogSearchParams): CatalogFilter {
  return {
    query: params.q?.trim() ?? '',
    visibility: CATALOG_VISIBILITIES.find((value) => value === params.show),
  };
}

/** Условия отбора как параметры адреса: их несут за собой ссылки разбивки. */
export function catalogFilterQuery(filter: CatalogFilter): Record<string, string> {
  return {
    ...(filter.query === '' ? {} : { q: filter.query }),
    ...(filter.visibility === undefined ? {} : { show: filter.visibility }),
  };
}

/** Выбрано ли хоть что-то: от этого зависит, какое пустое состояние показать. */
export function catalogFilterOn(filter: CatalogFilter): boolean {
  return Object.keys(catalogFilterQuery(filter)).length > 0;
}

export { CATALOG_PATH };
