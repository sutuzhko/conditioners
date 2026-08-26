import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Заведение наряда: шапка и полотно формы. */
export default function OrderNewLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="620px" />
    </div>
  );
}
