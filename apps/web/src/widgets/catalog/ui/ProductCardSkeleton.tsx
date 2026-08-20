import { Card, Skeleton } from '@/shared/ui';
import styles from './ProductCard.module.css';

/**
 * Карточка на время загрузки данных. Повторяет геометрию настоящей — иначе
 * при подстановке товаров вёрстка прыгает, а это прямой вклад в CLS
 * (docs/CLAUDE.md, «Формы и состояния»).
 */
export function ProductCardSkeleton() {
  return (
    <Card as="li" padding="none" className={styles.card}>
      <div className={styles.media}>
        <Skeleton variant="block" width="100%" height="100%" />
      </div>
      <div className={styles.body}>
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="45%" />
        <div className={styles.price}>
          <Skeleton variant="text" width="55%" height="22px" />
        </div>
        <div className={styles.actions}>
          <Skeleton variant="block" width="100%" height="var(--tap)" />
        </div>
      </div>
    </Card>
  );
}
