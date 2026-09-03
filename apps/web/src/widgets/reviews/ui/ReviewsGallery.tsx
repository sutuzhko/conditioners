'use client';

import { useId, useState, type ReactNode } from 'react';

import { Button, type ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { REVIEWS_VISIBLE_GRID, REVIEWS_VISIBLE_PHONE, type ReviewCardData } from '../model';
import { ReviewsCta } from '../ReviewsCta';
import { ReviewCard } from './ReviewCard';
import { ReviewDialog } from './ReviewDialog';
import { ReviewSlot } from './ReviewSlot';
import { ReviewsTrack } from './ReviewsTrack';
import styles from './ReviewsGallery.module.css';

export interface ReviewsGalleryProps {
  readonly reviews: readonly ReviewCardData[];
  /** Раскладка мест ленты: индекс отзыва или `null` под заготовку. */
  readonly slots: readonly (number | null)[];
  /** Едет ли лента сама на десктопе. */
  readonly drift: boolean;
  /** Адрес политики — уходит в форму отзыва. */
  readonly policyHref: ButtonLinkHref;
}

/**
 * На какой ширине кнопка «Все отзывы» имеет смысл: до 600 показаны две
 * карточки, до 1200 — четыре, с 1200 лента показывает всё. Значение уходит
 * в `data-reveal`, и CSS прячет кнопку там, где раскрывать нечего: кнопка,
 * которая ничего не делает, хуже отсутствующей.
 */
function revealScope(count: number): 'phone' | 'all' | undefined {
  if (count > REVIEWS_VISIBLE_GRID) return 'all';
  if (count > REVIEWS_VISIBLE_PHONE) return 'phone';
  return undefined;
}

/**
 * Отзывы: список, действия под ним и окно с отзывом целиком.
 *
 * 🔴 Окно одно на всю секцию, а не по одному на карточку: из него листают
 * соседние отзывы, а для этого нужно знать весь список и место в нём.
 *
 * Компонент клиентский, но карточки всё равно приходят в HTML с сервера:
 * Next рендерит клиентские компоненты при сборке страницы, и отзывы
 * индексируются без JavaScript (инвариант 1).
 */
export function ReviewsGallery({ reviews, slots, drift, policyHref }: ReviewsGalleryProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  /* 🔴 Кнопка не грузит и не строит — она снимает ограничение показа
     (ADR-195). Свёрнутое состояние начальное: на телефоне четыре карточки
     подряд занимают полтора экрана. */
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const reveal = revealScope(reviews.length);

  /**
   * Один проход по местам ленты. `copy` разводит ключи двух копий и помечает
   * вторую декоративной; `data-role` говорит стилям, что перед ними — отзыв,
   * заготовка или дубль.
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
            kind={copy === 'loop' ? 'loop' : 'review'}
          />
        );
      }

      return <ReviewSlot key={`${copy}-slot-${at}`} kind={copy === 'loop' ? 'loop' : 'slot'} />;
    });

  return (
    <>
      <ReviewsTrack id={listId} label={t.listLabel} drift={drift} clipped={!expanded}>
        {renderSlots('main')}
        {/* 🔴 Вторая копия — ради бесшовного хода ленты: доехав до её начала,
            лента переносит прокрутку на ширину первой, и человек этого не
            видит — под курсором ровно то же самое. Без копии конец ленты
            упирался в край и прыгал в начало рывком (ADR-124).

            Копии нет, пока лента стоит: там прокручивать нечего, а лишние
            карточки в разметке ничего не дают. */}
        {drift ? renderSlots('loop') : null}
      </ReviewsTrack>

      {/* Действия под списком: раскрыть остальные отзывы и написать свой.
          На телефоне — в ряд по половине ширины, как в макете. */}
      <div className={styles.actions} {...(reveal === undefined ? {} : { 'data-reveal': reveal })}>
        {reveal === undefined ? null : (
          <div className={styles.more}>
            <Button
              type="button"
              variant="bordered"
              fullWidth
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((was) => !was)}
            >
              {expanded ? t.showLess : t.showAll}
            </Button>
          </div>
        )}

        {/* 🔴 Кнопка остаётся на месте после раскрытия и сворачивает список
            обратно: исчезающая уносит с собой фокус, и человек с клавиатуры
            оказывается в начале документа (ADR-195). */}
        <div className={styles.action}>
          <ReviewsCta policyHref={policyHref} />
        </div>
      </div>

      <ReviewDialog
        reviews={reviews}
        at={openAt}
        onClose={() => setOpenAt(null)}
        onMove={setOpenAt}
      />
    </>
  );
}
