import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Компания: несколько независимых групп полей. */
export default function CompanyLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
      <FieldsSkeleton fields={4} />
    </div>
  );
}
