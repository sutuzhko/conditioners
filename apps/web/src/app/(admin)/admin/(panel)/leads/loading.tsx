import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Заявки: фильтры по статусу и карточки обращений. */
export default function LeadsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={4} height="240px" />
    </div>
  );
}
