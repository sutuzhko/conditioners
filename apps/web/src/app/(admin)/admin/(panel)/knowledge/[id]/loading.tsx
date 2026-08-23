import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Правка статьи: поля публикации и текст. */
export default function ArticleLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      <FieldsSkeleton fields={6} />
    </div>
  );
}
