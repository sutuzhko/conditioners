import Link from 'next/link';

import {
  catalogSearchParams,
  clearCatalogCompare,
  withCatalogCompare,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';
import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';

import { catalogListText as t, compareChipLabel } from '../content';
import { COMPARE_ANCHOR, type CatalogProduct } from '../model';
import { CompareTable } from './CompareTable';
import styles from './CatalogCompare.module.css';

const TITLE_ID = 'catalog-compare-title';

export interface CatalogCompareProps {
  /**
   * Отмеченные модели в порядке адреса. Их отбирает страница по всему
   * каталогу, а не по текущей выдаче: модель, отмеченную на второй странице,
   * фильтр не имеет права выкинуть из сравнения (ADR-109).
   */
  readonly products: readonly CatalogProduct[];
  /** Текущий запрос: из него собираются адреса «убрать» и «очистить». */
  readonly query: CatalogQuery;
  /** Адрес каталога: карту URL приносит страница, блок её не знает. */
  readonly basePath: string;
  /** Момент расчёта скидки — тот же, что у карточек (ADR-101). */
  readonly now?: Date | undefined;
  /** Справочник задаёт порядок строк и группы (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
}

/**
 * Сравнение по выбору клиента (ADR-109).
 *
 * 🔴 Серверная секция целиком: всё управление — обычные ссылки, меняющие
 * `?compare=` в адресе. Ни `'use client'`, ни килобайта в бюджете JS
 * публичной страницы (ADR-088). Плата за это — перезагрузка страницы на
 * каждую отметку; она честная: выбор, живущий только в состоянии, теряется
 * при первом же обновлении, а сравнение пересылают ссылкой.
 *
 * Три состояния, и все три показываются, а не подразумеваются:
 *
 * - **ничего не отмечено** — строка-приглашение над каталогом. Заголовок в
 *   этом состоянии виден только скринридеру: приглашение не раздел, и
 *   двадцать два пункта в оглавлении страницы ради него не нужны;
 * - **отмечена одна** — выбор виден списком, но таблицы нет: одна колонка
 *   повторила бы характеристики со страницы модели и ничего не сравнила;
 * - **отмечено две и больше** — таблица. Потолка нет, лишние колонки уходят
 *   в горизонтальную прокрутку внутри `Table`.
 *
 * Список отмеченного стоит над таблицей не для красоты: при пяти колонках
 * снять четвёртую, не прокручивая таблицу вбок, иначе нечем.
 */
export function CatalogCompare({
  products,
  query,
  basePath,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: CatalogCompareProps) {
  const chosen = products.length > 0;

  /* Отметка возвращает на якорь секции: клик по карточке в середине списка —
     это переход, и без якоря человек оказался бы в начале страницы, не увидев,
     куда попал его выбор. */
  const toggleHref = (
    slug: string,
  ): { pathname: string; query: Record<string, string>; hash: string } => ({
    pathname: basePath,
    query: catalogSearchParams(withCatalogCompare(query, slug)),
    hash: COMPARE_ANCHOR,
  });

  return (
    <section id={COMPARE_ANCHOR} className={styles.compare} aria-labelledby={TITLE_ID}>
      <div className={styles.head}>
        <h2 id={TITLE_ID} className={chosen ? styles.title : 'srOnly'}>
          {t.compareTitle}
        </h2>
        {chosen ? (
          // очистка не тащит якорь: секция схлопнется в одну строку, и
          // приземляться на неё незачем
          <Link
            className={styles.clear}
            href={{ pathname: basePath, query: catalogSearchParams(clearCatalogCompare(query)) }}
          >
            {t.compareClear}
          </Link>
        ) : null}
      </div>

      {chosen ? (
        <>
          <ul className={styles.chosen} aria-label={t.compareChosen}>
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  className={styles.chip}
                  href={toggleHref(product.slug)}
                  aria-label={compareChipLabel(product.name)}
                >
                  {product.name}
                  <span className={styles.remove} aria-hidden="true">
                    ×
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {products.length === 1 ? (
            <p className={styles.hint}>{t.compareAlone}</p>
          ) : (
            <CompareTable products={products} now={now} specDictionary={specDictionary} />
          )}
        </>
      ) : (
        <p className={styles.hint}>{t.compareHint}</p>
      )}
    </section>
  );
}
