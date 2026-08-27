import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../../page.module.css';

/** Новая позиция: заголовок и поля справочника. */
export default function StockItemNewLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
    </div>
  );
}
