import type { Metadata } from 'next';

import {
  ReviewList,
  ReviewTabs,
  reviewModerationContent as texts,
  reviewStatusOfTab,
  reviewTabFromParam,
  reviewsQuery,
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
 * остальные вкладки — архив, в который заходят по надобности. Архив только
 * растёт — отклонённые и архивные не удаляются (инвариант 7), — поэтому
 * список разбит на страницы.
 *
 * 🔴 Вкладка разбирается здесь, до чтения данных: раздел идёт в базу за тем
 * статусом, что стоит в адресе, и приходит уже открытым на нём (issue #340).
 * Мусор в параметре открывает первую вкладку, а не роняет раздел (#341).
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { tab, page } = await searchParams;
  const selected = reviewTabFromParam(tab);
  const status = reviewStatusOfTab(selected);

  const found = await listByStatus({
    ...(status === undefined ? {} : { status }),
    page: pageNumber(page),
  });

  /* 🔴 Пустая вкладка и пустой раздел — разные новости с противоположными
     шагами (issue #335). Раздел стартует без единого отзыва (инвариант 10), и
     сказать там «их скрыл выбранный статус» значит соврать. Второй запрос
     уходит только тогда, когда вкладка пуста, — то есть почти никогда. */
  const anyReviews =
    found.total > 0 || (status !== undefined && (await listByStatus({ page: 1 })).total > 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ReviewTabs active={selected} />

      <ReviewList reviews={found.items} filtered={status !== undefined && anyReviews} />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath="/admin/reviews"
        query={reviewsQuery(selected)}
      />
    </div>
  );
}
