import { describe, expect, it } from 'vitest';

import { buildReviewJsonLd, buildReviewsJsonLd, type ReviewForSchema } from './reviews';

const review: ReviewForSchema = {
  name: 'Ирина',
  rating: 5,
  text: 'Поставили за день, всё чисто',
  createdAt: new Date('2026-07-01T10:00:00Z'),
};

describe('Review', () => {
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
  });
});
