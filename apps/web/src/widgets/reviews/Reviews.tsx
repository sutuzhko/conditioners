import { ReviewForm } from '@/features/review-form';
import type { ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from './content';
import type { ReviewCardData } from './model';
import { ReviewCard } from './ui/ReviewCard';
import { ReviewsInvite } from './ui/ReviewsInvite';
import styles from './Reviews.module.css';

const HEADING_ID = 'reviews-title';

/**
 * Якорь формы: на него ведёт «Оставить отзыв» из приглашения и ссылки страниц.
 * Идентификатор выводится из адреса, а не наоборот, — иначе типизированные
 * маршруты не примут собранную из кусков строку.
 */
const FORM_HREF = '#review-form';
const FORM_ID = FORM_HREF.slice(1);

export interface ReviewsProps {
  /**
   * Одобренные отзывы в порядке вывода. 🔴 Блок в базу не ходит: список
   * приносит страница (docs/ORCHESTRATION.md, «Блок не ходит в базу»).
   *
   * Пустой список — основное состояние раздела: настоящих отзывов пока нет,
   * а выдуманные публиковать запрещено (инвариант 10, ADR-012).
   */
  reviews?: readonly ReviewCardData[] | undefined;
  /**
   * Адрес политики обработки персональных данных — уходит в форму. Пропсом,
   * а не литералом: `typedRoutes` не соберёт ссылку на несуществующий маршрут.
   */
  policyHref: ButtonLinkHref;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

/**
 * Отзывы и форма отзыва — одна секция макета.
 *
 * Серверный компонент: карточки приходят в HTML готовыми и индексируются без
 * JavaScript (инвариант 1). `'use client'` стоит только на самой форме —
 * интерактивна она, а не раздел.
 */
export function Reviews({ reviews = [], policyHref, id = 'reviews' }: ReviewsProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
        </header>

        <div className={styles.layout}>
          {reviews.length === 0 ? (
            <ReviewsInvite formHref={FORM_HREF} />
          ) : (
            <ul className={styles.grid} aria-label={t.listLabel}>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          )}

          <div className={styles.aside}>
            <ReviewForm id={FORM_ID} policyHref={policyHref} headingLevel={3} />
          </div>
        </div>
      </div>
    </section>
  );
}
