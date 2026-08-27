import Image from 'next/image';

import { formatDate, formatDateIso } from '@/shared/lib/format';
import { Card, Icon, Rating } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { initialOf, type ReviewCardData } from '../model';
import styles from './ReviewCard.module.css';

/** Кружок автора — 40px в макете; исходник вдвое больше ради ретины. */
const AVATAR_SIZE = 80;

export interface ReviewCardProps {
  review: ReviewCardData;
  /** Открыть отзыв целиком: в ленте текст обрезан. */
  onOpen?: (() => void) | undefined;
  /**
   * Карточка — дубль для бесшовного хода ленты, а не второй отзыв.
   *
   * 🔴 Скрыт от читалок и убран из обхода клавиатурой: тот же отзыв уже есть
   * в ленте настоящей карточкой, и объявлять его дважды значит врать о
   * количестве. Мышью дубль нажимается как обычная карточка — на глаз он от
   * неё неотличим, и «мёртвая» карточка под курсором была бы поломкой.
   */
  decorative?: boolean | undefined;
}

/**
 * Карточка отзыва. Серверная: интерактивности в ней нет, и текст обязан быть
 * в HTML сразу — отзывы индексируются вместе со страницей.
 *
 * 🔴 Текст выводится как есть и нигде не правится (инвариант 7).
 */
export function ReviewCard({ review, onOpen, decorative = false }: ReviewCardProps) {
  return (
    <Card
      as="li"
      padding="none"
      elevation="none"
      className={styles.card}
      aria-hidden={decorative ? true : undefined}
    >
      {/* Открывается вся карточка, а не ссылка в углу: цель размером с
          карточку попадается пальцем, а «читать целиком» отдельной строкой
          повторяло бы то, на что и так нажимают. */}
      <article className={styles.body}>
        <div className={styles.top}>
          <Rating value={review.rating} size="sm" />

          {/* Снимок в ленте не показываем: он вытягивал карточку и спорил с
              текстом. Значок говорит, что внутри есть фотография, — она
              открывается вместе с отзывом. */}
          {review.photo === null ? null : (
            <span className={styles.attach} title={t.hasPhoto}>
              <Icon name="camera" size={16} />
              <span className="srOnly">{t.hasPhoto}</span>
            </span>
          )}
        </div>

        {/* Показ обрезан по числу строк, само содержание — нет: полный текст
            остаётся в разметке и открывается в окне (инвариант 7). */}
        <blockquote className={styles.quote}>
          <p className={styles.text}>{review.text}</p>
        </blockquote>

        <footer className={styles.footer}>
          {review.avatar === null ? (
            /* Буква вместо фотографии: подставлять чужое лицо за автора
               нельзя, а пустой кружок ломает ритм подписи. */
            <span className={styles.avatar} aria-hidden="true">
              {initialOf(review.name)}
            </span>
          ) : (
            <Image
              className={styles.avatarPhoto}
              src={review.avatar}
              alt={t.avatarAlt(review.name)}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
            />
          )}
          <span className={styles.who}>
            <span className={styles.name}>{review.name}</span>
            <span className={styles.meta}>
              <span className="srOnly">{t.dateLabel} </span>
              <time dateTime={formatDateIso(review.createdAt)}>{formatDate(review.createdAt)}</time>
            </span>
          </span>
        </footer>
      </article>
      {onOpen === undefined ? null : (
        /* Кнопка растянута поверх карточки: клавиатура и экранный диктор
           получают обычную кнопку с понятным именем, а мышь — всю площадь. */
        <button
          type="button"
          className={styles.hit}
          onClick={onOpen}
          /* Дубль не попадает в обход клавиатурой: с Tab по ленте человек
             прошёл бы один и тот же отзыв дважды. */
          tabIndex={decorative ? -1 : undefined}
        >
          <span className="srOnly">{t.openCard(review.name)}</span>
        </button>
      )}
    </Card>
  );
}
