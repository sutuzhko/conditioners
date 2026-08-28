import Link from 'next/link';

import {
  catalogSearchParams,
  clearCatalogCompare,
  withCatalogCompare,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';
import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { catalogListText as t, compareChipLabel, productPageText } from './content';
import type { CatalogProduct } from './model';
import { CompareTable } from './ui/CompareTable';
import styles from './CatalogCompare.module.css';

const TITLE_ID = 'compare-results';

export interface CatalogCompareProps {
  /**
   * Отмеченные модели в порядке адреса. Их отбирает страница по всему
   * каталогу, а не по текущей выдаче: модель, отмеченную на второй странице,
   * фильтр не имеет права выкинуть из сравнения (ADR-109).
   */
  readonly products: readonly CatalogProduct[];
  /** Разобранный адрес: из него собираются ссылки «убрать» и «очистить». */
  readonly query: CatalogQuery;
  /** Адрес самой страницы сравнения: снятие отметки ведёт сюда же. */
  readonly basePath: string;
  /** Адрес каталога: возврат к выбору и единственный выход из пустого экрана. */
  readonly catalogPath: string;
  /** Куда ведёт «Оставить заявку» — якорь формы задаёт страница. */
  readonly orderHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки — тот же, что у разметки страницы (ADR-101). */
  readonly now?: Date | undefined;
  /** Справочник задаёт порядок строк и группы (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
}

/**
 * Сравнение по выбору клиента — содержимое страницы `/compare` (ADR-121).
 *
 * 🔴 Серверный блок целиком: всё управление — обычные ссылки, меняющие
 * `?compare=` в адресе. Ни `'use client'`, ни килобайта в бюджете JS
 * публичной страницы (ADR-088). Плата за это — перезагрузка страницы на
 * каждое снятие отметки; она честная: выбор, живущий только в состоянии,
 * теряется при первом же обновлении, а сравнение пересылают ссылкой.
 *
 * 🔴 Имя параметра осталось прежним (`?compare=slug,slug`) и разбирается тем
 * же `catalogQuery`: вторая реализация разбора адреса дороже некрасивого
 * адреса. Поэтому же сюда доезжает и подбор — возврат в каталог открывает ту
 * же выдачу, из которой человек пришёл.
 *
 * Три состояния, и все три показываются, а не подразумеваются:
 *
 * - **ничего не отмечено** — приглашение и дорога в каталог. Пустая страница
 *   вместо неё ничего не объясняет: сюда приходят и по пересланной ссылке, в
 *   которой все слаги успели устареть;
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
  catalogPath,
  orderHref,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: CatalogCompareProps) {
  /* Ссылки строятся по разобранному выбору: адрес мог принести слаг снятой с
     продажи модели, и тащить его дальше по ссылкам страницы незачем. */
  const current: CatalogQuery = { ...query, compare: products.map((product) => product.slug) };

  const toggleHref = (slug: string): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    query: catalogSearchParams(withCatalogCompare(current, slug)),
  });

  if (products.length === 0) {
    return (
      <section className={styles.compare} aria-labelledby={TITLE_ID}>
        <div className={styles.container}>
          <h2 id={TITLE_ID} className="srOnly">
            {t.compareTitle}
          </h2>

          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.compareEmptyTitle}</p>
            <p className={styles.emptyText}>{t.compareHint}</p>
            <ButtonLink
              href={{ pathname: catalogPath }}
              variant="accent"
              className={styles.emptyAction}
            >
              {t.compareToCatalog}
            </ButtonLink>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.compare} aria-labelledby={TITLE_ID}>
      <div className={styles.container}>
        <h2 id={TITLE_ID} className="srOnly">
          {t.compareTitle}
        </h2>

        <div className={styles.head}>
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

          <p className={styles.actions}>
            {/* Возврат несёт отметки с собой: человек пришёл сюда за таблицей,
                а не за тем, чтобы отмечать всё заново. */}
            <Link
              className={styles.back}
              href={{ pathname: catalogPath, query: catalogSearchParams(current) }}
            >
              {t.compareBack}
            </Link>
            {/* Очистка ведёт в каталог, а не оставляет на пустой странице:
                после неё сравнивать нечего, и выбирать снова — в витрине. */}
            <Link
              className={styles.clear}
              href={{
                pathname: catalogPath,
                query: catalogSearchParams(clearCatalogCompare(current)),
              }}
              aria-label={t.compareClearFull}
            >
              {t.compareClear}
            </Link>
          </p>
        </div>

        {products.length === 1 ? (
          <p className={styles.hint}>{t.compareAlone}</p>
        ) : (
          <CompareTable products={products} now={now} specDictionary={specDictionary} />
        )}

        {orderHref === undefined ? null : (
          <p className={styles.order}>
            <ButtonLink href={orderHref} variant="accent" size="lg">
              {productPageText.order}
            </ButtonLink>
          </p>
        )}
      </div>
    </section>
  );
}
