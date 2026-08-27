import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Журнал склада: заголовок и лента движений. */
export default function StockJournalLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="420px" />
    </div>
  );
}
