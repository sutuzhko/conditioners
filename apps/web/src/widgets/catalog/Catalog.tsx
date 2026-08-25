import Link from 'next/link';
import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { catalogText } from './content';
import type { CatalogProduct } from './model';
import { CompareTable } from './ui/CompareTable';
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
   */
  products: readonly CatalogProduct[];
  /** Куда ведёт «Заказать» и ссылка «подберём» — якорь формы заявки. */
  orderHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки: тесты и снепшоты фиксируют его, прод берёт «сейчас». */
  now?: Date | undefined;
  /** Данные ещё едут — вместо карточек скелетоны. */
  loading?: boolean | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
  /**
   * Справочник характеристик из настроек: он группирует характеристики в
   * карточке и задаёт порядок строк сравнения (ADR-094). Пустой — рабочее
   * состояние: характеристики просто идут одним списком.
   */
  specDictionary?: SpecDictionary | undefined;
}

const HEADING_ID = 'catalog-title';

/**
 * Витрина моделей и сравнение характеристик (docs/DESIGN_BRIEF.md §6, §10).
 *
 * Серверный компонент: карточки, цены и таблица приходят в HTML готовыми —
 * робот не ждёт JavaScript (инвариант 1). Интерактивности в блоке нет вовсе,
 * поэтому и `'use client'` нет.
 */
export function Catalog({
  products,
  orderHref = '#lead',
  now,
  loading = false,
  id = 'catalog',
  specDictionary = EMPTY_SPEC_DICTIONARY,
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
          <Link href={orderHref} className={styles.help}>
            {catalogText.help}
          </Link>
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
          <>
            <ul className={styles.grid}>
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  orderHref={orderHref}
                  now={now}
                  specDictionary={specDictionary}
                />
              ))}
            </ul>
            <CompareTable products={visible} now={now} specDictionary={specDictionary} />
          </>
        ) : null}
      </div>
    </section>
  );
}
