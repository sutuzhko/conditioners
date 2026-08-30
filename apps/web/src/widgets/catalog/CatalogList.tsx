import {
  catalogSearchParams,
  clearCatalogCompare,
  withCatalogCompare,
  type CatalogFacets,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';
import type { Page } from '@/shared/lib/paging';
import { ButtonLink, Card, Pager } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { catalogListText as t, catalogText } from './content';
import { COMPARE_ANCHOR, type CatalogProduct, type ProductHref } from './model';
import { ActiveFilters } from './ui/ActiveFilters';
import { CatalogFilters } from './ui/CatalogFilters';
import { CatalogSort } from './ui/CatalogSort';
import { CompareBar } from './ui/CompareBar';
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
   * Слаги моделей, отмеченных для сравнения, — уже отобранные по каталогу
   * (ADR-109). Отдельно от выдачи: отмеченная модель могла остаться на другой
   * странице или выпасть из текущего подбора, и отметку это выкинуть не имеет
   * права. Каталогу от них нужен только счётчик и адрес — таблица уехала на
   * `/compare` (ADR-121).
   */
  readonly compared: readonly string[];
  /** Адрес каталога. Маршрут приносит страница: блок карты URL не знает. */
  readonly basePath: string;
  /** Адрес страницы сравнения: туда ведёт «Сравнить» из строки отметок. */
  readonly comparePath: string;
  readonly productHref: ProductHref;
  /**
   * Куда ведёт кнопка из пустой выдачи. 🔴 Кнопки «Заказать» на карточках
   * сюда не смотрят: предмет каждой из них — своя модель, и адрес с ним
   * карточка считает сама (ADR-129). У «ничего не нашлось» предмета нет.
   */
  readonly orderHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки — один на страницу (ADR-101). */
  readonly now?: Date | undefined;
}

/**
 * Каталог: подбор, порядок, сетка моделей и разбивка на страницы (ADR-109).
 *
 * 🔴 Серверный блок целиком. Фильтры, сортировка, отметка и страницы — ссылки,
 * а не состояние: HTML приходит с сервера уже отфильтрованным (инвариант 1), и
 * собственный слой JavaScript у страницы каталога остаётся нулевым (ADR-088).
 *
 * 🔴 Первым в правой колонке идёт товар, а не подбор (ADR-121). Подбор ушёл
 * влево боковой колонкой и сворачивается на узкой ширине; таблица сравнения
 * уехала на свою страницу, а от неё здесь осталась строка со счётчиком. Всё,
 * что стоит между заголовком и сеткой, — счётчик найденного, порядок, чипы
 * выбранного и строка отметок: четыре строки, а не два экрана.
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
  comparePath,
  productHref,
  orderHref = '/#lead',
  now,
}: CatalogListProps) {
  /* 🔴 Ссылки строятся по разобранному выбору, а не по сырому параметру:
     адрес мог принести слаг снятой с продажи модели, и держать его в каждой
     ссылке страницы значит тащить мусор дальше. Так адрес чинит себя сам при
     первом же переходе. */
  const current: CatalogQuery = { ...query, compare: compared };
  const inCompare = new Set(compared);

  /* Разбивке параметры фильтра нужны без номера страницы: его она ставит
     сама. Иначе «дальше» уводило бы на ту же страницу, с которой пришли. */
  const pagerQuery = catalogSearchParams({ ...current, page: 1 });

  /* Отметка — переход по адресу с добавленным или убранным слагом. Якорь
     возвращает человека к строке отметок: он нажал «Сравнить» в середине
     списка, и без якоря оказался бы в начале страницы. */
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
        {/* Заголовок области — для скринридера: на экране роль названия играет
            `h1` страницы, а счётчик найденного заголовком не является. */}
        <h2 id={RESULTS_ID} className="srOnly">
          {t.resultsTitle}
        </h2>

        <div className={styles.layout}>
          <CatalogFilters facets={facets} query={current} basePath={basePath} />

          <div className={styles.results}>
            <div className={styles.toolbar}>
              <p className={styles.found}>{t.found(page.total)}</p>
              <CatalogSort query={current} basePath={basePath} />
            </div>

            <ActiveFilters query={current} basePath={basePath} />

            <CompareBar
              count={compared.length}
              compareHref={{ pathname: comparePath, query: catalogSearchParams(current) }}
              clearHref={{
                pathname: basePath,
                query: catalogSearchParams(clearCatalogCompare(current)),
              }}
            />

            {page.items.length === 0 ? (
              <Card variant="soft" padding="lg" className={styles.empty}>
                <p className={styles.emptyTitle}>{t.nothingTitle}</p>
                <p className={styles.emptyText}>{t.nothingText}</p>
                <ButtonLink href={orderHref} variant="flat" className={styles.emptyAction}>
                  {catalogText.order}
                </ButtonLink>
              </Card>
            ) : (
              <ul className={styles.grid}>
                {page.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
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
        </div>
      </div>
    </section>
  );
}
