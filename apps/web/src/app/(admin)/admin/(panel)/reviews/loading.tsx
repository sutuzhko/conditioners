import { ReviewTabs, reviewModerationContent as texts } from '@/features/review-moderation';
import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../leads/page.module.css';

/**
 * Отзывы: шапка и вкладки настоящие, скелетон — только у списка (issue #334).
 * Те же причины, что у заявок: статичная часть страницы рисуется как есть,
 * потому что только так её высота совпадает при любом переносе строк.
 *
 * Открытую вкладку заготовка не подсвечивает: параметров адреса `loading.tsx`
 * не получает, и подсветить он может только не ту.
 */
export default function ReviewsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ReviewTabs />

      <RowsSkeleton rows={4} className={styles.reviewSkeleton} />
    </div>
  );
}
