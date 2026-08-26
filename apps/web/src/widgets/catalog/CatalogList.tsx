import {
  catalogSearchParams,
  type CatalogFacets,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';
import type { Page } from '@/shared/lib/paging';
import { ButtonLink, Card, Pager } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { catalogListText as t, catalogText } from './content';
import type { CatalogProduct, ProductHref } from './model';
import { CatalogFilters } from './ui/CatalogFilters';
import { CatalogSort } from './ui/CatalogSort';
import { ProductCard } from './ui/ProductCard';
import styles from './CatalogList.module.css';

const RESULTS_ID = 'catalog-results';

export interface CatalogListProps {
  /** Страница выборки: модели, счётчик найденного и границы разбивки. */
  readonly page: Page<CatalogProduct>;
  /** Из чего выбирать — считается по всему каталогу, а не по выборке. */
  readonly facets: CatalogFacets;
  /** Текущий запрос: он же подсвечивает выбранные значения. */
  readonly query: CatalogQuery;
  /** Адрес каталога. Маршрут приносит страница: блок карты URL не знает. */
  readonly basePath: string;
  readonly productHref: ProductHref;
  readonly orderHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки — один на страницу (ADR-101). */
  readonly now?: Date | undefined;
}

/**
 * Каталог: подбор, порядок, сетка моделей и разбивка на страницы (ADR-109).
 *
 * 🔴 Серверный блок целиком. Фильтры, сортировка и страницы — ссылки, а не
 * состояние: HTML приходит с сервера уже отфильтрованным (инвариант 1), и
 * собственный слой JavaScript у страницы каталога остаётся нулевым (ADR-088).
 *
 * Заголовок области — `h2` для скринридера: `h1` на странице занят её
 * названием, а безымянный список из двенадцати карточек читается как каша.
 */
export function CatalogList({
  page,
  facets,
  query,
  basePath,
  productHref,
  orderHref = '/#lead',
  now,
}: CatalogListProps) {
  /* Разбивке параметры фильтра нужны без номера страницы: его она ставит
     сама. Иначе «дальше» уводило бы на ту же страницу, с которой пришли. */
  const pagerQuery = catalogSearchParams({ ...query, page: 1 });

  return (
    <section className={styles.section} aria-labelledby={RESULTS_ID}>
      <div className={styles.container}>
        <CatalogFilters facets={facets} query={query} basePath={basePath} />

        {/* Заголовок области — для скринридера: на экране роль названия играет
            `h1` страницы, а счётчик найденного заголовком не является. */}
        <h2 id={RESULTS_ID} className="srOnly">
          {t.resultsTitle}
        </h2>

        <div className={styles.toolbar}>
          <p className={styles.found}>{t.found(page.total)}</p>
          <CatalogSort query={query} basePath={basePath} />
        </div>

        {page.items.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.nothingTitle}</p>
            <p className={styles.emptyText}>{t.nothingText}</p>
            <ButtonLink href={orderHref} variant="accent" className={styles.emptyAction}>
              {catalogText.order}
            </ButtonLink>
          </Card>
        ) : (
          <ul className={styles.grid}>
            {page.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                orderHref={orderHref}
                detailsHref={productHref(product.slug)}
                now={now}
              />
            ))}
          </ul>
        )}

        <Pager
          page={page.page}
          pages={page.pages}
          basePath={basePath}
          query={pagerQuery}
          label={t.pagerLabel}
          position={t.pagerPosition}
        />
      </div>
    </section>
  );
}
