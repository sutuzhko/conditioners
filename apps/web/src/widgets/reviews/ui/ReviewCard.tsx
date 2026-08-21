import Image from 'next/image';

import { formatDate, formatDateIso } from '@/shared/lib/format';
import { Card, Rating } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { initialOf, type ReviewCardData } from '../model';
import styles from './ReviewCard.module.css';

/**
 * Ширина исходника фотографии в карточке. Снимки хранятся с длинной стороной
 * 1200px, карточке столько не нужно: 520×360 покрывает десктопную колонку
 * с запасом на ретину, а `sizes` даёт браузеру выбрать меньший вариант.
 */
const PHOTO_WIDTH = 520;
const PHOTO_HEIGHT = 360;
const PHOTO_SIZES = '(max-width: 599px) 100vw, (max-width: 1199px) 50vw, 300px';

export interface ReviewCardProps {
  review: ReviewCardData;
}

/**
 * Карточка отзыва. Серверная: интерактивности в ней нет, и текст обязан быть
 * в HTML сразу — отзывы индексируются вместе со страницей.
 *
 * 🔴 Текст выводится как есть и нигде не правится (инвариант 7).
 */
export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card as="li" padding="none" elevation="none" className={styles.card}>
      <article className={styles.body}>
        <Rating value={review.rating} size="sm" />

        {review.photo === null ? null : (
          <Image
            className={styles.photo}
            src={review.photo}
            alt={t.photoAlt}
            width={PHOTO_WIDTH}
            height={PHOTO_HEIGHT}
            sizes={PHOTO_SIZES}
          />
        )}

        <blockquote className={styles.quote}>
          <p className={styles.text}>{review.text}</p>
        </blockquote>

        <footer className={styles.footer}>
          <span className={styles.avatar} aria-hidden="true">
            {initialOf(review.name)}
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{review.name}</span>
            <span className={styles.meta}>
              {review.district === null ? null : (
                <>
                  {review.district}
                  <span aria-hidden="true"> · </span>
                </>
              )}
              <span className="srOnly">{t.dateLabel} </span>
              <time dateTime={formatDateIso(review.createdAt)}>{formatDate(review.createdAt)}</time>
            </span>
          </span>
        </footer>
      </article>
    </Card>
  );
}
