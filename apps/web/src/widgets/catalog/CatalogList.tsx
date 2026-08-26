import {
  catalogSearchParams,
  withCatalogCompare,
  type CatalogFacets,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';
import type { SpecDictionary } from '@/entities/product/lib/groupSpecs';
import type { Page } from '@/shared/lib/paging';
import { ButtonLink, Card, Pager } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { catalogListText as t, catalogText } from './content';
import { COMPARE_ANCHOR, type CatalogProduct, type ProductHref } from './model';
import { CatalogCompare } from './ui/CatalogCompare';
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
  /**
   * Модели, отмеченные для сравнения, в порядке адреса (ADR-109). Отдельно от
   * выдачи: отмеченная модель могла остаться на другой странице или выпасть
   * из текущего подбора, и сравнение обязано её пережить.
   */
  readonly compared: readonly CatalogProduct[];
  /** Справочник характеристик: он задаёт порядок строк сравнения (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
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
  compared,
  basePath,
  productHref,
  orderHref = '/#lead',
  now,
  specDictionary,
}: CatalogListProps) {
  /* 🔴 Ссылки строятся по разобранному выбору, а не по сырому параметру:
     адрес мог принести слаг снятой с продажи модели, и держать его в каждой
     ссылке страницы значит тащить мусор дальше. Так адрес чинит себя сам при
     первом же переходе. */
  const chosen = compared.map((product) => product.slug);
  const current: CatalogQuery = { ...query, compare: chosen };
  const inCompare = new Set(chosen);

  /* Разбивке параметры фильтра нужны без номера страницы: его она ставит
     сама. Иначе «дальше» уводило бы на ту же страницу, с которой пришли. */
  const pagerQuery = catalogSearchParams({ ...current, page: 1 });

  /* Отметка — переход по адресу с добавленным или убранным слагом. Якорь
     возвращает человека к таблице: он нажал «Сравнить» в середине списка. */
  const compareHref = (
    slug: string,
  ): { pathname: string; query: Record<string, string>; hash: string } => ({
    pathname: basePath,
    query: catalogSearchParams(withCatalogCompare(current, slug)),
    hash: COMPARE_ANCHOR,
  });

  return (
    <section className={styles.section} aria-labelledby={RESULTS_ID}>
      <div className={styles.container}>
        <CatalogFilters facets={facets} query={current} basePath={basePath} />

        <CatalogCompare
          products={compared}
          query={current}
          basePath={basePath}
          now={now}
          specDictionary={specDictionary}
        />

        {/* Заголовок области — для скринридера: на экране роль названия играет
            `h1` страницы, а счётчик найденного заголовком не является. */}
        <h2 id={RESULTS_ID} className="srOnly">
          {t.resultsTitle}
        </h2>

        <div className={styles.toolbar}>
          <p className={styles.found}>{t.found(page.total)}</p>
          <CatalogSort query={current} basePath={basePath} />
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
                compareHref={compareHref(product.slug)}
                compared={inCompare.has(product.slug)}
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
