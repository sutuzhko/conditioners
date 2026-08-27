import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Склад: заголовок, фильтр и таблица остатков по зонам. */
export default function StockLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={2} height="120px" />
      <RowsSkeleton rows={1} height="360px" />
    </div>
  );
}
