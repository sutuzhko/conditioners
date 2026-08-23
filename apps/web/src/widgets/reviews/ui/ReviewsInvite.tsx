import { ButtonLink, Card, Icon } from '@/shared/ui';
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
        <Icon name="chat" size={30} />
      </span>

      <h3 className={styles.title}>{t.emptyTitle}</h3>
      <p className={styles.text}>{t.emptyText}</p>

      {/* на телефоне форма уезжает под приглашение — без этой ссылки до неё
          пришлось бы долистывать вслепую */}
      <ButtonLink href={formHref} size="md" className={styles.cta}>
        {t.emptyCta}
      </ButtonLink>
    </Card>
  );
}
