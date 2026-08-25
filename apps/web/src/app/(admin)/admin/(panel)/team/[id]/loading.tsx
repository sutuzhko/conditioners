import { FieldsSkeleton, HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Карточка монтажника: форма аккаунта и заметки. */
export default function TeamMemberLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={4} />
      <RowsSkeleton rows={2} height="72px" />
    </div>
  );
}
