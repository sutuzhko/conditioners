import { RATING_MAX, RATING_MIN } from '@/entities/review/model';

import { compact, num, text, type JsonLdNode } from './schema';

/**
 * `Review` и `AggregateRating` (docs/SEO.md §4).
 *
 * 🔴 Только из настоящих одобренных отзывов (инвариант 10). Пока их нет —
 * разметки нет вовсе: нарисованный рейтинг это и обман поисковика, и нарушение
 * ФЗ «О рекламе». Раздел стартует пустым и это нормальное состояние (ADR-012).
 */

/** Минимум, который нужен разметке отзыва. Совпадает с доменным типом `Review`. */
export type ReviewForSchema = {
  readonly name: string;
  readonly rating: number;
  readonly text: string;
  readonly createdAt: Date;
};

/** Дата отзыва в разметке — календарный день, время публикации никому не нужно. */
function publishedDate(createdAt: Date): string | undefined {
  const time = createdAt instanceof Date ? createdAt.getTime() : Number.NaN;
  if (Number.isNaN(time)) return undefined;
  return createdAt.toISOString().slice(0, 10);
}

function ratingValue(value: number): number | undefined {
  const rating = num(value);
  if (rating === undefined) return undefined;
  return rating < RATING_MIN || rating > RATING_MAX ? undefined : rating;
}

/** Один отзыв. Без имени, текста или оценки узла нет — выдумывать их нечем. */
export function buildReviewJsonLd(review: ReviewForSchema): JsonLdNode | null {
  const author = text(review.name);
  const body = text(review.text);
  const rating = ratingValue(review.rating);

  if (author === undefined || body === undefined || rating === undefined) return null;

  return compact({
    '@type': 'Review',
    author: { '@type': 'Person', name: author },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: RATING_MAX,
      worstRating: RATING_MIN,
    },
    reviewBody: body,
    datePublished: publishedDate(review.createdAt),
  });
}

export function buildReviewsJsonLd(
  reviews: readonly ReviewForSchema[] | null | undefined,
): readonly JsonLdNode[] {
  if (!Array.isArray(reviews)) return [];
  return reviews.map(buildReviewJsonLd).filter((node): node is JsonLdNode => node !== null);
}

export type AggregateRatingOptions = {
  /**
   * Сколько отзывов считать достаточным. Порог задаёт вызывающий код: цифра
   * «достаточно» (docs/SEO.md §4) — продуктовое решение, а не свойство разметки.
   */
  readonly minCount?: number;
};

/**
 * Средняя оценка. Считается по тем же отзывам, что видны на странице, —
 * иначе число в разметке разойдётся с видимым текстом (инвариант 9).
 */
export function buildAggregateRatingJsonLd(
  reviews: readonly ReviewForSchema[] | null | undefined,
  options: AggregateRatingOptions = {},
): JsonLdNode | null {
  if (!Array.isArray(reviews)) return null;

  const ratings = reviews
    .map((review) => ratingValue(review.rating))
    .filter((rating): rating is number => rating !== undefined);

  const minCount = Math.max(1, options.minCount ?? 1);
  if (ratings.length < minCount) return null;

  const sum = ratings.reduce((total, rating) => total + rating, 0);

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round((sum / ratings.length) * 10) / 10,
    reviewCount: ratings.length,
    bestRating: RATING_MAX,
    worstRating: RATING_MIN,
  };
}
