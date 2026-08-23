import { HeadSkeleton, MonthSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Календарь: сетка месяца слева, дела выбранного дня справа. */
export default function CrmLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />

      <div className={styles.body}>
        <div className={styles.calendar}>
          <MonthSkeleton />
        </div>

        <RowsSkeleton rows={3} height="104px" />
      </div>
    </div>
  );
}
