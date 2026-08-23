import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../leads/page.module.css';

/** Модерация: фильтры по статусу и карточки отзывов. */
export default function ReviewsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={3} height="220px" />
    </div>
  );
}
