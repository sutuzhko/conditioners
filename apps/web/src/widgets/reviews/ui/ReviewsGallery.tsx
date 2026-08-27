'use client';

import { useState, type ReactNode } from 'react';

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

  /**
   * Один проход по местам ленты. `copy` разводит ключи двух копий и помечает
   * вторую декоративной.
   */
  const renderSlots = (copy: 'main' | 'loop'): readonly ReactNode[] =>
    slots.map((index, at) => {
      if (index !== null) {
        const review = reviews[index];
        return review === undefined ? null : (
          <ReviewCard
            key={`${copy}-${review.id}`}
            review={review}
            onOpen={() => setOpenAt(index)}
            decorative={copy === 'loop'}
          />
        );
      }

      return empty && at === inviteAt ? (
        <ReviewsInvite key={`${copy}-invite`} />
      ) : (
        <ReviewSlot key={`${copy}-slot-${at}`} />
      );
    });

  return (
    <>
      <ReviewsTrack label={t.listLabel} drift={drift}>
        {renderSlots('main')}
        {/* 🔴 Вторая копия — ради бесшовного хода: доехав до её начала, лента
            переносит прокрутку на ширину первой, и человек этого не видит —
            под курсором ровно то же самое. Без копии конец ленты упирался в
            край и прыгал в начало рывком (ADR-124).

            Копии нет, пока лента стоит: там прокручивать нечего, а лишние
            карточки в разметке ничего не дают. */}
        {drift ? renderSlots('loop') : null}
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
