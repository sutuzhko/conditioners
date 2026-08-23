'use client';

import { useState } from 'react';

import { reviewsContent as t } from '../content';
import type { ReviewCardData } from '../model';
import { ReviewCard } from './ReviewCard';
import { ReviewDialog } from './ReviewDialog';
import { ReviewSlot } from './ReviewSlot';
import { ReviewsInvite } from './ReviewsInvite';
import { ReviewsTrack } from './ReviewsTrack';

export interface ReviewsGalleryProps {
  readonly reviews: readonly ReviewCardData[];
  /** Раскладка мест: индекс отзыва или `null` под заготовку. */
  readonly slots: readonly (number | null)[];
  /** Место приглашения, когда отзывов нет вовсе. */
  readonly inviteAt: number;
  /** Едет ли лента сама. */
  readonly drift: boolean;
}

/**
 * Лента отзывов и окно с отзывом целиком.
 *
 * 🔴 Окно одно на всю ленту, а не по одному на карточку: из него листают
 * соседние отзывы, а для этого нужно знать весь список и место в нём.
 *
 * Компонент клиентский, но карточки всё равно приходят в HTML с сервера:
 * Next рендерит клиентские компоненты при сборке страницы, и отзывы
 * индексируются без JavaScript (инвариант 1).
 */
export function ReviewsGallery({ reviews, slots, inviteAt, drift }: ReviewsGalleryProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const empty = reviews.length === 0;

  return (
    <>
      <ReviewsTrack label={t.listLabel} drift={drift}>
        {slots.map((index, at) => {
          if (index !== null) {
            const review = reviews[index];
            return review === undefined ? null : (
              <ReviewCard key={review.id} review={review} onOpen={() => setOpenAt(index)} />
            );
          }

          return empty && at === inviteAt ? (
            <ReviewsInvite key="invite" />
          ) : (
            <ReviewSlot key={`slot-${at}`} />
          );
        })}
      </ReviewsTrack>

      <ReviewDialog
        reviews={reviews}
        at={openAt}
        onClose={() => setOpenAt(null)}
        onMove={setOpenAt}
      />
    </>
  );
}
