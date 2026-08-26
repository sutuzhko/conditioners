import {
  CATALOG_SORTS,
  catalogSearchParams,
  withCatalogQuery,
  type CatalogQuery,
  type CatalogSort as CatalogSortValue,
} from '@/entities/product/lib/catalogQuery';

import { catalogListText as t } from '../content';
import { FilterLink } from './FilterLink';
import styles from './CatalogSort.module.css';

export interface CatalogSortProps {
  readonly query: CatalogQuery;
  readonly basePath: string;
}

/**
 * Подписи порядка. Лежат здесь, а не в домене: домен знает значения
 * параметра, а как они называются по-русски — вопрос текста (docs/CLAUDE.md,
 * «Контент»).
 */
const SORT_LABELS: Readonly<Record<CatalogSortValue, string>> = {
  default: t.sortDefault,
  'price-asc': t.sortPriceAsc,
  'price-desc': t.sortPriceDesc,
  'area-asc': t.sortAreaAsc,
};

/** Порядок каталога — ссылками, как и фильтры: выбор живёт в адресе. */
export function CatalogSort({ query, basePath }: CatalogSortProps) {
  return (
    <div className={styles.sort} role="group" aria-labelledby="catalog-sort">
      <p className={styles.label} id="catalog-sort">
        {t.sortTitle}
      </p>
      <div className={styles.values}>
        {CATALOG_SORTS.map((value) => (
          <FilterLink
            key={value}
            href={{
              pathname: basePath,
              query: catalogSearchParams(withCatalogQuery(query, { sort: value })),
            }}
            selected={query.sort === value}
          >
            {SORT_LABELS[value]}
          </FilterLink>
        ))}
      </div>
    </div>
  );
}
