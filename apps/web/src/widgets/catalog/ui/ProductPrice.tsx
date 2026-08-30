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
 * ключ», без «−0%». Перечёркнутая цена появляется только когда её вернул
 * `getActivePrice`, то есть когда товар действительно продавался по ней
 * (инвариант 14). Процент вычисляется там же и здесь не считается.
 *
 * 🔴 Слот под ярлык скидки рисуется **всегда**, в том числе у модели без
 * скидки (issue #259). Он и ставит цену и кнопку соседей по ряду на общую
 * линию: пока высоту добавлял только ярлык, главная цифра карточки плясала
 * по ряду. Высота слота постоянная (`--sale-slot-h`), поэтому длинная подпись
 * владельца — «Летняя цена» шире плашки «−9%» — не может перенести его на
 * вторую строку.
 */
export function ProductPrice({ price }: ProductPriceProps) {
  const label =
    price.saleLabel ??
    (price.discountPercent === null ? null : discountLabel(price.discountPercent));

  return (
    <div className={styles.price}>
      {/* Цена и приписка стоят в одной строке по базовой линии, как в макете:
          это одно утверждение о цене, а не два. Приписок ровно одна — либо
          «под ключ», либо прежняя цена: две приписки рядом с ценой со скидкой
          не помещались в строку колонки и переносили её. */}
      <p className={styles.main}>
        <span className={styles.current}>{formatMoney(price.currentPrice)}</span>
        {price.oldPrice === null ? (
          <span className={styles.turnkey}>{catalogText.turnkey}</span>
        ) : (
          <s className={styles.old}>
            <span className="srOnly">{catalogText.oldPrice} </span>
            {formatMoney(price.oldPrice)}
          </s>
        )}
      </p>

      <p className={styles.slot}>
        {label === null ? null : (
          <Badge variant="sale" size="sm" className={styles.sale}>
            {label}
          </Badge>
        )}
        {price.saleTo === null ? null : (
          <span className={styles.until}>{saleUntilLabel(formatDate(price.saleTo))}</span>
        )}
      </p>
    </div>
  );
}
