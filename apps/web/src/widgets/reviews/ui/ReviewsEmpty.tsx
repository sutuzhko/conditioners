import type { ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import { ReviewsCta } from '../ReviewsCta';
import styles from './ReviewsEmpty.module.css';

/**
 * 🔴 Пустое состояние раздела — его основное состояние.
 *
 * Настоящих отзывов у проекта пока нет, а выдуманные публиковать запрещено
 * (инвариант 10, ADR-012). Поэтому вместо серого «отзывов пока нет» здесь
 * объяснение, почему раздел пуст, и приглашение написать первый.
 *
 * 🔴 Ни карусели, ни карточки-заготовки (issue #274). Лента из заготовок
 * читается как поломка вёрстки, а карточка, повторяющая разметку отзыва, —
 * как отзыв, написанный компанией о самой себе. Цифр в блоке нет ни одной:
 * ни счётчика работ, ни средней оценки (ADR-151).
 */
export function ReviewsEmpty({ policyHref }: { readonly policyHref: ButtonLinkHref }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{t.emptyTitle}</p>
      <p className={styles.text}>{t.emptyText}</p>
      <ReviewsCta policyHref={policyHref} className={styles.cta} />
    </div>
  );
}
