import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** База знаний: кнопка добавления и список статей. */
export default function KnowledgeLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <RowsSkeleton rows={5} height="64px" />
    </div>
  );
}
