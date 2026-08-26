import Link from 'next/link';
import { Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { catalogText } from './content';
import type { CatalogProduct, ProductHref } from './model';
import { ProductCard } from './ui/ProductCard';
import { ProductCardSkeleton } from './ui/ProductCardSkeleton';
import styles from './Catalog.module.css';

/** Сколько карточек-заглушек показать, пока каталог едет. Ровно один ряд. */
const SKELETON_COUNT = 4;

export interface CatalogProps {
  /**
   * Модели в порядке вывода. 🔴 Блок в базу не ходит: список приносит
   * страница (docs/ORCHESTRATION.md, «Блок не ходит в базу»). Невидимые
   * модели отсеиваются здесь, чтобы блок нельзя было случайно показать
   * скрытый товар.
   *
   * На главной это витрина — то, что владелец вынес флагом `featured`, а не
   * весь ассортимент (ADR-109).
   */
  products: readonly CatalogProduct[];
  /** Адрес страницы модели: карта URL принадлежит странице, а не блоку. */
  productHref: ProductHref;
  /**
   * Адрес каталога с этой моделью, отмеченной для сравнения (ADR-109).
   * Не задан — отметки на карточках витрины нет.
   *
   * 🔴 Сравнение живёт на `/catalog`, а не здесь: витрина показывает то, что
   * владелец вынес флагом `featured`, и сравнивать «всё вынесенное скопом»
   * — ровно та бесполезная таблица, которую это решение и убирает.
   */
  compareHref?: ProductHref | undefined;
  /** Ссылка во весь каталог. Нет — заголовок остаётся без неё. */
  catalogHref?: ButtonLinkHref | undefined;
  /** Куда ведёт «Заказать» и ссылка «подберём» — якорь формы заявки. */
  orderHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки: тесты и снепшоты фиксируют его, прод берёт «сейчас». */
  now?: Date | undefined;
  /** Данные ещё едут — вместо карточек скелетоны. */
  loading?: boolean | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

const HEADING_ID = 'catalog-title';

/**
 * Витрина моделей на лендинге (docs/DESIGN_BRIEF.md §6, §10).
 *
 * Серверный компонент: карточки и цены приходят в HTML готовыми — робот не
 * ждёт JavaScript (инвариант 1). Интерактивности в блоке нет вовсе, поэтому и
 * `'use client'` нет.
 *
 * 🔴 Таблицы сравнения здесь больше нет (ADR-109). Она показывала все видимые
 * модели скопом и становилась полезной только случайно; сравнивают теперь то,
 * что клиент отметил сам, — на `/catalog`, где выбор живёт в адресе. С витрины
 * туда ведёт отметка «Сравнить» на карточке: модель приезжает в сравнение уже
 * отмеченной.
 */
export function Catalog({
  products,
  productHref,
  compareHref,
  catalogHref,
  orderHref = '#lead',
  now,
  loading = false,
  id = 'catalog',
}: CatalogProps) {
  const visible = products.filter((product) => product.visible);

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID} data-band>
      <div className={styles.container}>
        <header className={styles.head}>
          <div className={styles.intro}>
            <p className={styles.kicker}>{catalogText.kicker}</p>
            <h2 id={HEADING_ID} className={styles.title}>
              {catalogText.title}
            </h2>
            <p className={styles.lead}>{catalogText.lead}</p>
          </div>
          <div className={styles.headLinks}>
            {catalogHref === undefined ? null : (
              <Link href={catalogHref} className={styles.help}>
                {catalogText.all}
              </Link>
            )}
            <Link href={orderHref} className={styles.help}>
              {catalogText.help}
            </Link>
          </div>
        </header>

        {loading ? (
          <ul className={styles.grid} aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </ul>
        ) : null}

        {!loading && visible.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{catalogText.emptyTitle}</p>
            <p className={styles.emptyText}>{catalogText.emptyText}</p>
          </Card>
        ) : null}

        {!loading && visible.length > 0 ? (
          <ul className={styles.grid}>
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                orderHref={orderHref}
                detailsHref={productHref(product.slug)}
                compareHref={compareHref === undefined ? undefined : compareHref(product.slug)}
                now={now}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
