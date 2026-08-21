'use client';

import { useRouter } from 'next/navigation';

import { Card } from '@/shared/ui';

import { ReviewCardView } from './ReviewCardView';
import { reviewModerationContent as texts } from './content';
import { reviewApi } from './lib';
import type { ReviewCard } from './model';
import styles from './ReviewList.module.css';

export interface ReviewListProps {
  readonly reviews: readonly ReviewCard[];
  readonly filtered?: boolean | undefined;
}

/** Список отзывов в модерации. */
export function ReviewList({ reviews, filtered = false }: ReviewListProps) {
  const router = useRouter();

  if (reviews.length === 0) {
    return (
      <Card as="section" className={styles.empty}>
        <h2 className={styles.emptyTitle}>{filtered ? texts.emptyFiltered : texts.emptyTitle}</h2>
        {filtered ? null : <p className={styles.emptyText}>{texts.emptyText}</p>}
      </Card>
    );
  }

  return (
    <div className={styles.list}>
      {reviews.map((review) => (
        <ReviewCardView
          key={review.id}
          review={review}
          api={reviewApi}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}
