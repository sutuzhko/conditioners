import { FieldsSkeleton, HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../../page.module.css';

/** Карточка позиции: справочные данные, форма движения и журнал. */
export default function StockItemLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={4} />
      <RowsSkeleton rows={1} height="260px" />
    </div>
  );
}
