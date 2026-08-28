import Link from 'next/link';

import {
  catalogSearchParams,
  isNarrowedCatalog,
  withCatalogQuery,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';

import { activeFilterChipLabel, catalogListText as t } from '../content';
import { activeCatalogFilters } from '../model';
import styles from './ActiveFilters.module.css';

export interface ActiveFiltersProps {
  readonly query: CatalogQuery;
  /** Адрес каталога: карту URL приносит страница, блок её не знает. */
  readonly basePath: string;
}

/**
 * Выбранные параметры подбора — чипами рядом со счётчиком найденного
 * (ADR-121).
 *
 * 🔴 Существуют затем, что подбор сворачивается: без них человек остаётся
 * наедине с тремя моделями и без объяснения, куда делись остальные. Поэтому
 * чипы стоят у счётчика, а не внутри свёрнутой панели.
 *
 * Каждый чип — ссылка, снимающая ровно свой параметр; соседние остаются на
 * месте. Ссылка, а не кнопка: подбор живёт в адресе (ADR-109), и ни одного
 * килобайта клиентского кода здесь не появляется.
 */
export function ActiveFilters({ query, basePath }: ActiveFiltersProps) {
  const active = activeCatalogFilters(query);
  if (active.length === 0) return null;

  return (
    <div className={styles.row}>
      <ul className={styles.list} aria-label={t.activeTitle}>
        {active.map((filter) => (
          <li key={filter.key}>
            <Link
              className={styles.chip}
              href={{
                pathname: basePath,
                query: catalogSearchParams(withCatalogQuery(query, filter.clear)),
              }}
              aria-label={activeFilterChipLabel(filter.label)}
            >
              {filter.label}
              <span className={styles.remove} aria-hidden="true">
                ×
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Сброс всего подбора: сортировка сюда тоже входит — она сужает выдачу
          так же незаметно, как фильтр, и `isNarrowedCatalog` считает её
          вместе с ним. */}
      {isNarrowedCatalog(query) ? (
        <Link className={styles.reset} href={{ pathname: basePath }}>
          {t.reset}
        </Link>
      ) : null}
    </div>
  );
}
