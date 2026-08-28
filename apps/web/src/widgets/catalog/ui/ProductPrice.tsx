import { Badge } from '@/shared/ui';
import type { ActivePrice } from '@/entities/product/model';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { catalogText, discountLabel, saleUntilLabel } from '../content';
import styles from './ProductPrice.module.css';

export interface ProductPriceProps {
  /** Результат `getActivePrice` — единственный источник правды о скидке. */
  price: ActivePrice;
  /**
   * 🔴 Держать место под строку срока акции, даже когда скидки нет.
   *
   * Включается там, где цены стоят рядом в ряду: у модели со скидкой блок
   * занимает две строки, у соседей одну — и главная цифра карточки оказывается
   * на строку выше соседних (BUGS, аудит 28 августа). Резерв ставит их на
   * общую базовую линию. Вне ряда — на странице модели — он не нужен: сравнивать
   * там не с чем, а пустая строка под ценой была бы дырой.
   */
  reserveNote?: boolean | undefined;
}

/**
 * Цена на витрине (docs/DESIGN_BRIEF.md §10).
 *
 * 🔴 Состояние «скидки нет» основное: тогда рисуется одна цена и подпись «под
 * ключ», без пустых мест и без «−0%». Перечёркнутая цена появляется только
 * когда её вернул `getActivePrice`, то есть когда товар действительно
 * продавался по ней (инвариант 14).
 */
export function ProductPrice({ price, reserveNote = false }: ProductPriceProps) {
  const label =
    price.saleLabel ??
    (price.discountPercent === null ? null : discountLabel(price.discountPercent));

  return (
    <div className={styles.price}>
      {/* Цена и «под ключ» стоят в одной строке по базовой линии, как в
          макете: это одно утверждение о цене, а не два. */}
      <p className={styles.main}>
        <span className={styles.current}>{formatMoney(price.currentPrice)}</span>
        <span className={styles.turnkey}>{catalogText.turnkey}</span>
        {price.oldPrice === null ? null : (
          <s className={styles.old}>
            <span className="srOnly">{catalogText.oldPrice} </span>
            {formatMoney(price.oldPrice)}
          </s>
        )}
        {label === null ? null : (
          <Badge variant="sale" size="sm" className={styles.sale}>
            {label}
          </Badge>
        )}
      </p>
      {price.saleTo === null ? (
        /* Пустая строка того же размера — резерв, а не содержимое: читалке её
           не видно, а ряд карточек получает общую базовую линию цены. */
        reserveNote ? (
          <p className={styles.note} aria-hidden="true" />
        ) : null
      ) : (
        <p className={styles.note}>
          <span className={styles.until}>{saleUntilLabel(formatDate(price.saleTo))}</span>
        </p>
      )}
    </div>
  );
}
