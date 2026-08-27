import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Черновик наряда по обращению: шапка и полотно формы. */
export default function LeadOrderLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={1} height="620px" />
    </div>
  );
}
