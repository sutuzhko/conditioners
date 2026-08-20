import { Badge } from '@/shared/ui';
import type { ActivePrice } from '@/entities/product/model';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { catalogText, discountLabel, saleUntilLabel } from '../content';
import styles from './ProductPrice.module.css';

export interface ProductPriceProps {
  /** Результат `getActivePrice` — единственный источник правды о скидке. */
  price: ActivePrice;
}

/**
 * Цена на витрине (docs/DESIGN_BRIEF.md §10).
 *
 * 🔴 Состояние «скидки нет» основное: тогда рисуется одна цена и подпись «под
 * ключ», без пустых мест и без «−0%». Перечёркнутая цена появляется только
 * когда её вернул `getActivePrice`, то есть когда товар действительно
 * продавался по ней (инвариант 14).
 */
export function ProductPrice({ price }: ProductPriceProps) {
  const label =
    price.saleLabel ??
    (price.discountPercent === null ? null : discountLabel(price.discountPercent));

  return (
    <div className={styles.price}>
      <p className={styles.main}>
        <span className={styles.current}>{formatMoney(price.currentPrice)}</span>
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
      <p className={styles.note}>
        <span>{catalogText.turnkey}</span>
        {price.saleTo === null ? null : (
          <span className={styles.until}>{saleUntilLabel(formatDate(price.saleTo))}</span>
        )}
      </p>
    </div>
  );
}
