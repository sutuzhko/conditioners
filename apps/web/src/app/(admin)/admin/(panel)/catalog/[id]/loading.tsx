import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Правка модели: форма с характеристиками, фотографиями и скидкой. */
export default function ProductLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={8} />
    </div>
  );
}
