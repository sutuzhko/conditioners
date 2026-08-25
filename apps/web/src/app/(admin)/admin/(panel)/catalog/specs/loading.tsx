import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Справочник характеристик: заголовок и группы полей. */
export default function SpecsDictionaryLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
    </div>
  );
}
