import { RATING_MAX, RATING_MIN } from '@/entities/review/model';

import { compact, num, text, type JsonLdNode } from './schema';

/**
 * Узлы `Review` (docs/SEO.md §4).
 *
 * 🔴 Только из настоящих одобренных отзывов (инвариант 10). Пока их нет —
 * разметки нет вовсе: нарисованный рейтинг это и обман поисковика, и нарушение
 * ФЗ «О рекламе». Раздел стартует пустым и это нормальное состояние (ADR-012).
 *
 * 🔴 Средней оценки здесь нет и быть не должно (ADR-151). Собранный на
 * собственном сайте о самом себе `AggregateRating` Google у `LocalBusiness`
 * не поддерживает, и это основание для ручных санкций — худший исход для
 * проекта, который живёт органикой.
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
