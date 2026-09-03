import type { Metadata } from 'next';
import Link from 'next/link';

import {
  REVIEW_STATUSES,
  ReviewList,
  isReviewStatus,
  reviewModerationContent as texts,
} from '@/features/review-moderation';
import { requireOwnerPage } from '@/server/guards';
import { listByStatus } from '@/server/repo/reviews';
import { pageNumber } from '@/shared/lib/paging';
import { Pager } from '@/shared/ui';

import styles from '../leads/page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Модерация отзывов.
 *
 * По умолчанию открывается на «На модерации»: именно они требуют решения, а
 * остальные статусы — архив, в который заходят по надобности. Архив только
 * растёт — отклонённые и архивные не удаляются (инвариант 7), — поэтому
 * список разбит на страницы.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { status, page } = await searchParams;
  const selected = status !== undefined && isReviewStatus(status) ? status : undefined;
  const found = await listByStatus({ status: selected, page: pageNumber(page) });

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
          aria-current={selected === undefined ? 'page' : undefined}
          href={{ pathname: '/admin/reviews' }}
        >
          {texts.filterAll}
        </Link>

        {REVIEW_STATUSES.map((value) => (
          <Link
            className={[styles.filter, selected === value ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            aria-current={selected === value ? 'page' : undefined}
            key={value}
            href={{ pathname: '/admin/reviews', query: { status: value } }}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <ReviewList reviews={found.items} filtered={selected !== undefined} />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath="/admin/reviews"
        query={selected === undefined ? undefined : { status: selected }}
      />
    </div>
  );
}
