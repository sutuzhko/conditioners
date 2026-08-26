import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Клиенты: заголовок, поиск и карточки людей. */
export default function ClientsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={4} height="150px" />
    </div>
  );
}
