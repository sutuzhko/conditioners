import { FieldsSkeleton, HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../../page.module.css';

/** Карточка позиции: справочные данные и журнал её движений. */
export default function StockItemLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
      <RowsSkeleton rows={1} height="320px" />
    </div>
  );
}
