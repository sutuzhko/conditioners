'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { formatDate, formatDateIso } from '@/shared/lib/format';
import { Card, Icon, Rating } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { initialOf, type ReviewCardData } from '../model';
import styles from './ReviewCard.module.css';

/** Кружок автора — 36px в макете; исходник вдвое больше ради ретины. */
const AVATAR_SIZE = 72;

/**
 * 🔴 Размер на экране, а не размер файла. Без `sizes` `next/image` считает,
 * что картинка растянута во всю ширину окна, и тянет вариант `w=256` ради
 * кружка в тридцать шесть пикселей: на отзывах это десяток лишних запросов
 * на первом экране (BUGS §2528). Кружок фиксирован вёрсткой — значит и
 * подсказка фиксированная, а удвоение под ретину даёт `AVATAR_SIZE`.
 */
const AVATAR_SIZES = '36px';

export interface ReviewCardProps {
  review: ReviewCardData;
  /** Открыть отзыв целиком: в списке текст обрезан по четвёртой строке. */
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
  /** Чем карточка приходится списку: отзывом или дублём ленты. */
  kind?: 'review' | 'loop' | undefined;
}

/**
 * Карточка отзыва (issue #274, issue #275).
 *
 * 🔴 Текст выводится как есть и нигде не правится (инвариант 7). Обрезка —
 * представление, а не правка: полный текст остаётся в разметке, читалка
 * читает его целиком, поисковик индексирует целиком, а по нажатию он
 * открывается в окне.
 */
export function ReviewCard({
  review,
  onOpen,
  decorative = false,
  kind = 'review',
}: ReviewCardProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  /**
   * Не поместился ли текст в отведённые строки. 🔴 Меряется, а не
   * угадывается по длине строки: число строк меняется на пороге 1200, ширина
   * карточки — на каждом, и «Читать целиком» под коротким отзывом обещает
   * продолжение, которого нет (issue #275).
   */
  const [clipped, setClipped] = useState(false);
  /* Фотография автора может не загрузиться. Битая картинка вместо лица —
     худшее из состояний: возвращаем кружок с буквой. */
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    if (node === null) return;

    const check = (): void => setClipped(node.scrollHeight - node.clientHeight > 1);
    check();

    /* Пересчёт на смене размеров: порог 1200 меняет число строк, а поворот
       телефона — ширину карточки. В окружении без `ResizeObserver` (jsdom)
       остаётся замер при монтировании — в браузере он и есть основной. */
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [review.text]);

  const showPhoto = review.avatar !== null && !avatarBroken;

  return (
    <Card
      as="li"
      padding="none"
      elevation="none"
      className={styles.card}
      data-role={kind}
      aria-hidden={decorative ? true : undefined}
    >
      {/* Открывается вся карточка, а не ссылка в углу: цель размером с
          карточку попадается пальцем, а «Читать целиком» остаётся признаком
          обрезки, а не единственной целью нажатия. */}
      <article className={styles.body}>
        <div className={styles.top}>
          <Rating value={review.rating} size="sm" />

          {/* Снимок в карточке не показываем: он вытягивал её и спорил с
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
          <p ref={textRef} className={styles.text}>
            {review.text}
          </p>
          {clipped ? <span className={styles.more}>{t.readFull}</span> : null}
        </blockquote>

        <footer className={styles.footer}>
          {/* 🔴 Кружок стоит на месте с первого кадра и занимает свои 36×36 до
              загрузки фотографии, при её отказе и когда её нет вовсе
              (issue #22): без резерва подпись под аватаром прыгала в момент
              подмены — это прямо в CLS. Буква вместо стокового лица: рисовать
              за автора чужую физиономию значит выдумывать отзыв наполовину. */}
          <span className={styles.avatar}>
            <span className={styles.initial} aria-hidden="true">
              {initialOf(review.name)}
            </span>
            {showPhoto && review.avatar !== null ? (
              <Image
                className={styles.avatarPhoto}
                src={review.avatar}
                alt={t.avatarAlt(review.name)}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                sizes={AVATAR_SIZES}
                onError={() => setAvatarBroken(true)}
              />
            ) : null}
          </span>
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
