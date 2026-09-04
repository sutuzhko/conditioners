import { Card, Skeleton } from '@/shared/ui';
import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Заказы: заголовок, стопки, ряд фильтров и таблица нарядов (issue #334, #345).
 *
 * Заголовок здесь зависит от роли — владелец видит «Заказы», монтажник свои
 * выезды, — поэтому шапка остаётся заготовкой, но строчного бокса той же
 * высоты, что у `h1` с кнопкой рядом. Остальные высоты сняты с готовой
 * страницы: лента стопок, ряд фильтров, шапка таблицы и её строки.
 */
export default function OrdersLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton lines={2} action />
      <Skeleton variant="block" className={styles.tabsSkeleton} />
      <Skeleton variant="block" className={styles.filtersSkeleton} />

      <Card as="section" padding="none">
        <Skeleton variant="block" className={styles.headSkeleton} />
        <RowsSkeleton rows={4} className={styles.rowSkeleton} />
      </Card>
    </div>
  );
}
