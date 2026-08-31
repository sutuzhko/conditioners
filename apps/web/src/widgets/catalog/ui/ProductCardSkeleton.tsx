import { Card, Skeleton } from '@/shared/ui';
import styles from './ProductCard.module.css';
import priceStyles from './ProductPrice.module.css';

/**
 * Карточка на время загрузки данных. Повторяет геометрию настоящей — иначе
 * при подстановке товаров вёрстка прыгает, а это прямой вклад в CLS
 * (docs/CLAUDE.md, «Формы и состояния»).
 */
export function ProductCardSkeleton() {
  return (
    <Card as="li" padding="none" radius="ml" elevation="none" className={styles.card}>
      <div className={styles.media}>
        <Skeleton variant="block" width="100%" height="100%" />
      </div>
      <div className={styles.body}>
        <div className={styles.nameReserve}>
          <Skeleton variant="text" width="70%" />
        </div>
        <div className={styles.meta}>
          <Skeleton variant="text" width="45%" height="16px" />
        </div>
        <div className={priceStyles.price}>
          <Skeleton variant="text" width="55%" height="24px" />
          {/* Слот под ярлык скидки: пустой, но своей высоты — у настоящей
              карточки он есть всегда, и без него кнопка скелетона встала бы
              выше подставляемой. */}
          <div className={priceStyles.slot} />
        </div>
        <div className={styles.actions}>
          <Skeleton variant="block" width="100%" height="var(--tap)" />
        </div>
      </div>
    </Card>
  );
}
