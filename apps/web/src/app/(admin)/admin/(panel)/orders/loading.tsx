import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Заказы: заголовок, фильтр и карточки нарядов. */
export default function OrdersLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={4} height="170px" />
    </div>
  );
}
