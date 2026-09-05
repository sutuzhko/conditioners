'use client';

import { useState, type ReactNode } from 'react';

import { useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import { RejectDialog } from './RejectDialog';
import { REVIEW_ACTION_STATUS } from './model';
import type { ReviewAction, ReviewApi, ReviewCard } from './model';

export interface ReviewActionsInput {
  readonly review: ReviewCard;
  readonly api: ReviewApi;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

export interface ReviewActionsControl {
  /** Идёт запрос: кнопки ряда на это время выключаются. */
  readonly busy: boolean;
  /** Отказ сервера словами; пустая строка — жаловаться не на что. */
  readonly message: string;
  /** Выполнить действие: спросить подтверждение или причину, если они нужны. */
  readonly perform: (action: ReviewAction) => void;
  /** Окна отказа и подтверждения — их выводит тот, кто зовёт хук. */
  readonly dialogs: ReactNode;
}

/**
 * Действия над отзывом: подтверждение, причина отказа, запрос и его ошибка.
 *
 * 🔴 Одна реализация на карточку и на строку таблицы (issue #613). Вкладка
 * «На модерации» осталась карточками, остальные стали таблицами, — и если бы
 * у строки завёлся свой обработчик, отказ без причины (ADR-300) и
 * подтверждение удаления (ADR-113) пришлось бы соблюдать дважды. Второе место
 * рано или поздно отстаёт от первого, и отстаёт молча.
 *
 * 🔴 Правки текста здесь нет и не будет (инвариант 7): каждое действие — это
 * смена статуса, кроме `remove`, который стирает запись целиком.
 */
export function useReviewActions({
  review,
  api,
  onChanged,
  confirmRemove,
}: ReviewActionsInput): ReviewActionsControl {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
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

    /* 🔴 Отказ без причины не отправляется (ADR-300): сначала окно, и только
       потом запрос. Причина неразрывна с решением и уходит вместе с ним. */
    if (action === 'reject') {
      setRejecting(true);
      return;
    }

    void run(() => api.setStatus(review.id, { status: REVIEW_ACTION_STATUS[action] }));
  };

  const reject = (reason: string): void => {
    void (async () => {
      await run(() => api.setStatus(review.id, { status: 'rejected', reason }));
      setRejecting(false);
    })();
  };

  return {
    busy,
    message,
    perform,
    dialogs: (
      <>
        <RejectDialog
          open={rejecting}
          name={review.name}
          busy={busy}
          onCancel={() => setRejecting(false)}
          onConfirm={reject}
        />
        {dialog}
      </>
    ),
  };
}
