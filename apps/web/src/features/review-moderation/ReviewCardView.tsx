'use client';

import { useState } from 'react';

import { REVIEW_STATUS_VARIANT } from '@/entities/review/model';
import { Avatar, Badge, Button, Card, Rating, useConfirm } from '@/shared/ui';
import type { ButtonVariant, Confirm } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import { REVIEW_ACTION_STATUS, reviewActionsFor } from './model';
import type { ReviewAction, ReviewApi, ReviewCard, ReviewTab } from './model';
import { ReviewPhoto } from './ReviewPhoto';
import styles from './ReviewCardView.module.css';

export interface ReviewCardViewProps {
  readonly review: ReviewCard;
  readonly api: ReviewApi;
  /** Открытая вкладка: от неё зависит, что можно сделать с отзывом. */
  readonly tab?: ReviewTab | undefined;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/** Подпись и заметность действия. Порядок в ряду задаёт `reviewActionsFor`. */
const ACTION_LOOK: Record<ReviewAction, { label: string; variant: ButtonVariant }> = {
  approve: { label: texts.approve, variant: 'solid' },
  reject: { label: texts.reject, variant: 'bordered' },
  restore: { label: texts.restore, variant: 'bordered' },
  archive: { label: texts.archive, variant: 'bordered' },
  remove: { label: texts.remove, variant: 'light' },
};

/**
 * Отзыв в модерации.
 *
 * 🔴 Текст выводится и не правится (инвариант 7): ни на одной вкладке нет
 * поля ввода поверх него. Модератор меняет только статус.
 *
 * 🔴 Текст показан целиком, без «показать ещё» (issue #356): решение
 * принимают по отзыву, а не по первой его строке.
 */
export function ReviewCardView({
  review,
  api,
  tab,
  onChanged,
  confirmRemove,
}: ReviewCardViewProps) {
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

  const perform = (action: ReviewAction): void => {
    if (action === 'remove') {
      void (async () => {
        if (!(await ask(texts.removeConfirm))) return;
        await run(() => api.remove(review.id));
      })();
      return;
    }

    void run(() => api.setStatus(review.id, REVIEW_ACTION_STATUS[action]));
  };

  const actions = reviewActionsFor(tab ?? 'all', review.status);

  return (
    <Card as="article" className={styles.card}>
      <header className={styles.header}>
        <Avatar
          name={review.name}
          size="lg"
          {...(review.avatar === null ? {} : { src: review.avatar })}
        />

        <div className={styles.who}>
          <div className={styles.line}>
            <h2 className={styles.name}>{review.name}</h2>
            <Rating value={review.rating} caption={texts.rating(review.rating)} />
            <Badge variant={REVIEW_STATUS_VARIANT[review.status]} size="sm">
              {texts.statusTitle(review.status)}
            </Badge>
          </div>

          <time className={styles.when} dateTime={review.createdAt}>
            {texts.when(review.createdAt)}
          </time>
        </div>

        {/* 🔴 От 1200px действия стоят справа в шапке; ниже уходят вниз в ряд
            по половине ширины — две кнопки в строке дают цель 44px без
            переноса (issue #356). Разметка одна, место меняет сетка. */}
        <div className={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={ACTION_LOOK[action].variant}
              className={action === 'remove' ? styles.remove : undefined}
              disabled={busy}
              onClick={() => perform(action)}
            >
              {ACTION_LOOK[action].label}
            </Button>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {/* Чужие слова: цитата, а не поле ввода — правки к ней не
            предполагается, и «показать ещё» здесь тоже нет. */}
        <blockquote className={styles.text}>{review.text}</blockquote>

        {review.photo === null ? null : (
          <div className={styles.photo}>
            <ReviewPhoto src={review.photo} name={review.name} />
          </div>
        )}
      </div>

      {/* 🔴 Причина отказа пока не хранится (issue #522). Место под неё
          готово, а отсутствие названо честно: пустая строка читалась бы
          как «причины не было». */}
      {review.status === 'rejected' ? (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>{texts.reasonTitle}</span>
          <span className={styles.reasonMissing}>{texts.reasonMissing}</span>
        </p>
      ) : null}

      {tab === 'pending' && review.rating <= 3 ? (
        <p className={styles.note}>{texts.lowRatingNote}</p>
      ) : null}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
