'use client';

import { Button } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { REVIEW_ACTION_LOOK } from './ReviewCardView';
import { reviewModerationContent as texts } from './content';
import { reviewActionsFor } from './model';
import type { ReviewApi, ReviewCard, ReviewTab } from './model';
import { useReviewActions } from './useReviewActions';
import styles from './ReviewRowActions.module.css';

export interface ReviewRowActionsProps {
  readonly review: ReviewCard;
  readonly api: ReviewApi;
  /** Открытая вкладка: от неё зависит, что можно сделать с отзывом. */
  readonly tab: ReviewTab;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Действия над отзывом в строке таблицы (issue #613).
 *
 * 🔴 Подписями, а не круглыми значками, как в остальных списках панели. Здесь
 * действие меняет состояние отзыва — «Снять с сайта», «Вернуть на модерацию»,
 * — и значок для него пришлось бы придумывать: глаз и карандаш означают
 * «открыть» и «править», а править отзыв нельзя вовсе (инвариант 7).
 *
 * 🔴 Набор берётся из `reviewActionsFor`, а не рисуется по месту: на вкладке
 * «Все» у каждой строки свой статус, и действия обязаны быть теми же, что
 * дала бы своя вкладка отзыва.
 */
export function ReviewRowActions({
  review,
  api,
  tab,
  onChanged,
  confirmRemove,
}: ReviewRowActionsProps) {
  const { busy, message, perform, dialogs } = useReviewActions({
    review,
    api,
    onChanged,
    confirmRemove,
  });

  const actions = reviewActionsFor(tab, review.status);

  return (
    <div className={styles.cell}>
      <div className={styles.actions} role="group" aria-label={texts.rowActions(review.name)}>
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={REVIEW_ACTION_LOOK[action].variant}
            className={action === 'remove' ? styles.remove : undefined}
            disabled={busy}
            onClick={() => perform(action)}
          >
            {REVIEW_ACTION_LOOK[action].label}
          </Button>
        ))}
      </div>

      {/* Отказ сервера остаётся в своей строке: общая полоса над таблицей не
          сказала бы, какой именно отзыв не сохранился. */}
      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialogs}
    </div>
  );
}
