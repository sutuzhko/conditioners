import Link from 'next/link';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { Card } from '@/shared/ui';

import { areaLabel, powerClassLabel, productPageText as t } from '../content';
import type { CatalogProduct, ProductHref } from '../model';
import { ProductPrice } from './ProductPrice';
import styles from './SimilarProducts.module.css';

const TITLE_ID = 'product-similar';

export interface SimilarProductsProps {
  /** Уже отобранные модели: отбор — чистая функция `similarProducts`. */
  readonly products: readonly CatalogProduct[];
  /** Карта адресов принадлежит странице, а не блоку. */
  readonly productHref: ProductHref;
  /** Момент расчёта скидки — тот же, что у цены самой модели (ADR-101). */
  readonly now?: Date | undefined;
}

/**
 * Похожие модели под характеристиками.
 *
 * 🔴 Строками, а не карточками с фото. Причин две. Фотографии всех соседних
 * моделей — это лишние картинки в HTML страницы, ради которой человек пришёл
 * за одной моделью, и отдельный заведённый дефект про вес каталога. И
 * сравнивать нужно ровно три вещи — класс, площадь и цену; карточка витрины
 * повторяла бы главную сетку каталога и спорила бы с ней за внимание.
 *
 * Каждая строка выравнивается сама по себе, поэтому резерв под срок акции
 * здесь не нужен: строки идут одна под другой, а не в ряд.
 */
export function SimilarProducts({ products, productHref, now }: SimilarProductsProps) {
  return (
    <section className={styles.similar} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className={styles.title}>
        {t.similarTitle}
      </h2>

      <ul className={styles.list} aria-label={t.similarLabel}>
        {products.map((product) => (
          <Card
            as="li"
            key={product.id}
            padding="md"
            radius="ml"
            interactive
            className={styles.row}
          >
            <div className={styles.info}>
              <h3 className={styles.name}>
                <Link href={productHref(product.slug)} className={styles.link}>
                  {product.name}
                </Link>
              </h3>
              <p className={styles.meta}>
                {powerClassLabel(product.badge)} · {areaLabel(product.areaMax)}
              </p>
            </div>
            <div className={styles.price}>
              <ProductPrice price={getActivePrice(product, now)} />
            </div>
          </Card>
        ))}
      </ul>
    </section>
  );
}
