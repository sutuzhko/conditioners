import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Карточка наряда: шапка и полотно формы. */
export default function OrderLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="620px" />
    </div>
  );
}
