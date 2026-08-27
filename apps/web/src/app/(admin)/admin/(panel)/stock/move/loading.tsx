import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Движение: заголовок и поля формы. */
export default function StockMoveLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={5} />
    </div>
  );
}
