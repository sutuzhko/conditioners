import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Карточка клиента: данные и обращения. */
export default function ClientLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={2} height="280px" />
    </div>
  );
}
