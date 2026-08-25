import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Профиль: заголовок и две формы полями. */
export default function ProfileLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={5} />
    </div>
  );
}
