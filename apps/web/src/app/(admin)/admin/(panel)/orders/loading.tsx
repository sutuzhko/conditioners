import { Skeleton } from '@/shared/ui';
import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Заказы: заголовок, карточка фильтров и карточки нарядов (issue #334).
 *
 * Заголовок здесь зависит от роли — владелец видит «Заказы», монтажник свои
 * выезды, — поэтому шапка остаётся заготовкой, но строчного бокса той же
 * высоты, что у `h1` с кнопкой рядом. Карточка фильтров и наряды — высотой
 * по замеру готовой страницы.
 */
export default function OrdersLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton lines={2} action />
      <Skeleton variant="block" className={styles.filtersSkeleton} />
      <RowsSkeleton rows={4} className={styles.rowSkeleton} />
    </div>
  );
}
