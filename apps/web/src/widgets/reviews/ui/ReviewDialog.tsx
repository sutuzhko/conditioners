'use client';

import Image from 'next/image';
import { useState } from 'react';

import { formatDate, formatDateIso } from '@/shared/lib/format';
import { Icon, IconButton, Modal, Rating } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { initialOf, type ReviewCardData } from '../model';
import styles from './ReviewDialog.module.css';

/** Снимок в окне: 1200px по длинной стороне и есть исходник в хранилище. */
const PHOTO_WIDTH = 1200;
const PHOTO_HEIGHT = 800;
/** Тот же кружок, что в ленте: 40px, исходник вдвое больше ради ретины. */
const AVATAR_SIZE = 80;

/**
 * 🔴 Размер на экране, а не размер файла. Без `sizes` `next/image` считает,
 * что картинка растянута во всю ширину окна, и тянет вариант `w=256` ради
 * кружка в сорок пикселей: на отзывах это десяток лишних запросов на первом
 * экране отзывов (BUGS §2528). Кружок фиксирован вёрсткой — значит и подсказка
 * фиксированная, а удвоение под ретину даёт `AVATAR_SIZE`.
 */
const AVATAR_SIZES = '40px';

export interface ReviewDialogProps {
  readonly reviews: readonly ReviewCardData[];
  /** Какой отзыв открыт; `null` — окно закрыто. */
  readonly at: number | null;
  readonly onClose: () => void;
  readonly onMove: (to: number) => void;
}

/**
 * Отзыв целиком.
 *
 * 🔴 Здесь показывается всё, что прислал человек: текст без обрезки, его
 * фотография и снимок с места установки. В ленте текст обрезан, а снимок
 * места виден мелко — окно и открывают затем, чтобы рассмотреть.
 *
 * Листание по кругу: дойдя до последнего отзыва, стрелка возвращает к
 * первому. Упереться в край и не понять, кончились отзывы или сломались
 * кнопки, — худший из возможных исходов.
 */
export function ReviewDialog({ reviews, at, onClose, onMove }: ReviewDialogProps) {
  /* Фотография автора может не загрузиться — так бывает, когда файл удалили из
     хранилища, а отзыв остался. Битая картинка вместо лица хуже кружка с
     буквой: карточка ленты подставляет букву, и окно обязано вести себя так
     же (issue #22). Ключ — сам отзыв: листание меняет автора, и отказ
     прошлого снимка не должен гасить снимок следующего. */
  const [broken, setBroken] = useState<string | null>(null);

  const review = at === null ? undefined : reviews[at];
  if (review === undefined || at === null) return null;

  const showPhoto = review.avatar !== null && broken !== review.id;

  const total = reviews.length;
  const step = (delta: number): void => onMove((at + delta + total) % total);

  return (
    <Modal open onClose={onClose} title={t.openTitle} size="md">
      <div className={styles.dialog}>
        {/* Прокручивается содержимое, а не окно целиком: полоса управления
            обязана оставаться на виду у отзыва любой длины. */}
        <div className={styles.scroll}>
          <div className={styles.head}>
            <span className={styles.initial}>
              <span className={styles.letter} aria-hidden="true">
                {initialOf(review.name)}
              </span>
              {showPhoto && review.avatar !== null ? (
                <Image
                  className={styles.avatar}
                  src={review.avatar}
                  alt={t.avatarAlt(review.name)}
                  width={AVATAR_SIZE}
                  height={AVATAR_SIZE}
                  sizes={AVATAR_SIZES}
                  onError={() => setBroken(review.id)}
                />
              ) : null}
            </span>

            <div className={styles.who}>
              <p className={styles.name}>{review.name}</p>
              <p className={styles.date}>
                <span className="srOnly">{t.dateLabel} </span>
                <time dateTime={formatDateIso(review.createdAt)}>
                  {formatDate(review.createdAt)}
                </time>
              </p>
            </div>

            <Rating value={review.rating} size="sm" />
          </div>

          <blockquote className={styles.quote}>
            <p className={styles.text}>{review.text}</p>
          </blockquote>

          {review.photo === null ? null : (
            /* Оформление то же, что у карточки: рамка, радиус, кадр 3:2.
             Отдельный вид со своей подписью выглядел чужим блоком. */
            <Image
              className={styles.photo}
              src={review.photo}
              alt={t.photoAlt}
              width={PHOTO_WIDTH}
              height={PHOTO_HEIGHT}
              sizes="(max-width: 599px) 100vw, 520px"
            />
          )}
        </div>

        {total < 2 ? null : (
          <div className={styles.nav}>
            <IconButton
              label={t.prevLabel}
              icon={<Icon name="arrow-right" className={styles.back} />}
              onClick={() => step(-1)}
            />
            <p className={styles.counter}>{t.counter(at + 1, total)}</p>
            <IconButton
              label={t.nextLabel}
              icon={<Icon name="arrow-right" />}
              onClick={() => step(1)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
