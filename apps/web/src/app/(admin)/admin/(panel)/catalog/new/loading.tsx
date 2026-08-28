import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Новая модель: заголовок и поля формы. */
export default function NewProductLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={8} />
    </div>
  );
}
