import Link from 'next/link';

import { REVIEW_STATUSES, reviewModerationContent as texts } from '@/features/review-moderation';
import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from '../leads/page.module.css';

/**
 * Отзывы: шапка и фильтры настоящие, скелетон — только у списка (issue #334).
 * Те же причины, что у заявок: статичная часть страницы рисуется как есть,
 * потому что только так её высота совпадает при любом переносе строк.
 */
export default function ReviewsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <nav className={styles.filters} aria-label={texts.filterLabel}>
        <Link className={styles.filter} href={{ pathname: '/admin/reviews' }}>
          {texts.filterAll}
        </Link>
        {REVIEW_STATUSES.map((value) => (
          <Link
            className={styles.filter}
            key={value}
            href={{ pathname: '/admin/reviews', query: { status: value } }}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <RowsSkeleton rows={4} className={styles.reviewSkeleton} />
    </div>
  );
}
