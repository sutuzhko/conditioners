import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../../page.module.css';

/** Новая зона: заголовок и поля. */
export default function StockZoneNewLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={4} />
    </div>
  );
}
