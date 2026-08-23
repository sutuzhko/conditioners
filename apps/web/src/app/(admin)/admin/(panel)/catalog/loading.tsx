import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Каталог: кнопка добавления и список моделей. */
export default function CatalogLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={5} height="64px" />
    </div>
  );
}
