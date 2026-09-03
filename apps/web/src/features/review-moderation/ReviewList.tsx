'use client';

import { useRouter } from 'next/navigation';

import { ButtonLink, Card, EmptyState } from '@/shared/ui';

import { ReviewCardView } from './ReviewCardView';
import { reviewModerationContent as texts } from './content';
import { reviewApi } from './lib';
import { reviewsHref, type ReviewCard } from './model';
import styles from './ReviewList.module.css';

export interface ReviewListProps {
  readonly reviews: readonly ReviewCard[];
  readonly filtered?: boolean | undefined;
}

/** Список отзывов в модерации. */
export function ReviewList({ reviews, filtered = false }: ReviewListProps) {
  const router = useRouter();

  if (reviews.length === 0) {
    /* Пусто и «ничего не найдено» — разные состояния (issue #335). Фильтр
       живёт в адресе, поэтому сброс — ссылка, а не обработчик. */
    return (
      <Card as="section">
        {filtered ? (
          <EmptyState
            icon="search"
            title={texts.emptyFiltered}
            action={
              /* Сброс ведёт на «Все», а не в раздел: раздел без параметра —
                 это «На модерации», то есть снова фильтр (issue #340). */
              <ButtonLink href={reviewsHref('all')} size="sm" variant="bordered">
                {texts.emptyFilteredAction}
              </ButtonLink>
            }
          >
            {texts.emptyFilteredText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="chat"
            title={texts.emptyTitle}
            action={
              <ButtonLink href="/#reviews" size="sm" variant="bordered">
                {texts.emptyAction}
              </ButtonLink>
            }
          >
            {texts.emptyText}
          </EmptyState>
        )}
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
