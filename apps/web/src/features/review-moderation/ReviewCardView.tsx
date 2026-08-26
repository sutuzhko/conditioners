'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Badge, Button, Card, Rating, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import type { ReviewApi, ReviewCard, ReviewStatus } from './model';
import styles from './ReviewCardView.module.css';

export interface ReviewCardViewProps {
  readonly review: ReviewCard;
  readonly api: ReviewApi;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

const STATUS_VARIANT: Record<ReviewStatus, 'accent' | 'success' | 'neutral' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'neutral',
  archived: 'neutral',
};

/**
 * Отзыв в модерации.
 *
 * 🔴 Текст выводится и не правится (инвариант 7). Действия — только статус и
 * удаление; отклонение и архив сохраняют отзыв в базе, удаление стирает.
 */
export function ReviewCardView({ review, api, onChanged, confirmRemove }: ReviewCardViewProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await action();

    setBusy(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  const setStatus = (status: ReviewStatus): void => {
    void run(() => api.setStatus(review.id, status));
  };

  return (
    <Card as="article" className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.name}>{review.name}</h2>
        </div>

        <div className={styles.headerRight}>
          <Badge variant={STATUS_VARIANT[review.status]}>{texts.statusTitle(review.status)}</Badge>
          <time className={styles.when} dateTime={review.createdAt}>
            {texts.when(review.createdAt)}
          </time>
        </div>
      </header>

      <Rating value={review.rating} caption={texts.rating(review.rating)} />

      {/* Текст в blockquote: это чужие слова, и правки к ним не предполагается. */}
      <blockquote className={styles.text}>{review.text}</blockquote>

      {review.photo === null ? null : (
        <Image
          className={styles.photo}
          src={review.photo}
          alt={texts.photoAlt(review.name)}
          width={220}
          height={220}
        />
      )}

      <div className={styles.actions}>
        {review.status === 'approved' ? null : (
          <Button type="button" size="sm" disabled={busy} onClick={() => setStatus('approved')}>
            {texts.approve}
          </Button>
        )}

        {review.status === 'rejected' ? null : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setStatus('rejected')}
          >
            {texts.reject}
          </Button>
        )}

        {review.status === 'archived' ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setStatus('archived')}
          >
            {texts.archive}
          </Button>
        )}

        {review.status === 'pending' ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setStatus('pending')}
          >
            {texts.restore}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.remove}
          disabled={busy}
          onClick={() => {
            void (async () => {
              if (!(await ask(texts.removeConfirm))) return;
              await run(() => api.remove(review.id));
            })();
          }}
        >
          {texts.remove}
        </Button>
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
