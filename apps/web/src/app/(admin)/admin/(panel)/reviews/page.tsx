import type { Metadata } from 'next';
import Link from 'next/link';

import {
  REVIEW_STATUSES,
  ReviewList,
  isReviewStatus,
  reviewModerationContent as texts,
} from '@/features/review-moderation';
import { listByStatus } from '@/server/repo/reviews';

import styles from '../leads/page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Модерация отзывов.
 *
 * По умолчанию открывается на «На модерации»: именно они требуют решения, а
 * остальные статусы — архив, в который заходят по надобности.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const selected = status !== undefined && isReviewStatus(status) ? status : undefined;
  const reviews = await listByStatus(selected);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <nav className={styles.filters} aria-label={texts.filterLabel}>
        <Link
          className={[styles.filter, selected === undefined ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={{ pathname: '/admin/reviews' }}
        >
          {texts.filterAll}
        </Link>

        {REVIEW_STATUSES.map((value) => (
          <Link
            className={[styles.filter, selected === value ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            key={value}
            href={{ pathname: '/admin/reviews', query: { status: value } }}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <ReviewList reviews={reviews} filtered={selected !== undefined} />
    </div>
  );
}
