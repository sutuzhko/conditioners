import { ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from '../content';
import styles from './ReviewsInvite.module.css';

export interface ReviewsInviteProps {
  /** Куда ведёт «Оставить отзыв» — якорь формы, стоящей рядом в этой же секции. */
  formHref: ButtonLinkHref;
}

/**
 * 🔴 Пустое состояние раздела — его основное состояние.
 *
 * Настоящих отзывов у проекта пока нет, а выдуманные публиковать запрещено
 * (инвариант 10, ADR-012). Поэтому вместо серого «отзывов пока нет» здесь
 * приглашение: раздел объясняет, почему он пуст, и зовёт написать первым.
 * Это честная позиция, а не дыра в вёрстке.
 */
export function ReviewsInvite({ formHref }: ReviewsInviteProps) {
  return (
    <Card variant="soft" padding="lg" className={styles.invite}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m12 7 1.35 2.74 3.02.44-2.18 2.13.51 3.01L12 13.9l-2.7 1.42.51-3.01-2.18-2.13 3.02-.44z"
            fill="currentColor"
          />
        </svg>
      </span>

      <h3 className={styles.title}>{t.emptyTitle}</h3>
      <p className={styles.text}>{t.emptyText}</p>

      <p className={styles.pointsTitle}>{t.emptyPointsLabel}</p>
      <ul className={styles.points}>
        {t.emptyPoints.map((point) => (
          <li key={point} className={styles.point}>
            <svg
              className={styles.tick}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {point}
          </li>
        ))}
      </ul>

      {/* на телефоне форма уезжает под приглашение — без этой ссылки до неё
          пришлось бы долистывать вслепую */}
      <ButtonLink href={formHref} size="md" className={styles.cta}>
        {t.emptyCta}
      </ButtonLink>
    </Card>
  );
}
