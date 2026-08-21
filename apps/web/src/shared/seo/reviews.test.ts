import { describe, expect, it } from 'vitest';

import {
  buildAggregateRatingJsonLd,
  buildReviewJsonLd,
  buildReviewsJsonLd,
  type ReviewForSchema,
} from './reviews';

const review: ReviewForSchema = {
  name: 'Ирина',
  rating: 5,
  text: 'Поставили за день, всё чисто',
  createdAt: new Date('2026-07-01T10:00:00Z'),
};

describe('Review и AggregateRating', () => {
  it('собирает отзыв из того, что человек действительно написал', () => {
    expect(buildReviewJsonLd(review)).toEqual({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Ирина' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 },
      reviewBody: review.text,
      datePublished: '2026-07-01',
    });
  });

  it('отзыв без имени, текста или оценки в разметку не попадает', () => {
    expect(buildReviewJsonLd({ ...review, name: ' ' })).toBeNull();
    expect(buildReviewJsonLd({ ...review, text: '' })).toBeNull();
    expect(buildReviewJsonLd({ ...review, rating: 0 })).toBeNull();
    expect(buildReviewJsonLd({ ...review, rating: 6 })).toBeNull();
  });

  it('🔴 пустой раздел отзывов не даёт ни одного узла разметки', () => {
    expect(buildReviewsJsonLd([])).toEqual([]);
    expect(buildReviewsJsonLd(undefined)).toEqual([]);
    expect(buildAggregateRatingJsonLd([])).toBeNull();
    expect(buildAggregateRatingJsonLd(null)).toBeNull();
  });

  it('средняя оценка округляется до десятых и считается по всем отзывам', () => {
    const node = buildAggregateRatingJsonLd([
      review,
      { ...review, rating: 4 },
      { ...review, rating: 4 },
    ]);

    expect(node).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.3,
      reviewCount: 3,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it('порог отзывов уважается', () => {
    expect(buildAggregateRatingJsonLd([review], { minCount: 2 })).toBeNull();
    expect(buildAggregateRatingJsonLd([review], { minCount: 1 })).not.toBeNull();
  });
});
