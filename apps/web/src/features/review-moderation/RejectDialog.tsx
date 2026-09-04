'use client';

import { useState } from 'react';

import { REJECT_REASON_MAX, REJECT_REASON_MIN } from '@/entities/review/model';
import { Button, Modal, Textarea } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';

export interface RejectDialogProps {
  readonly open: boolean;
  /** Имя автора — окно должно называть отзыв, а не «этот элемент». */
  readonly name: string;
  readonly busy?: boolean | undefined;
  readonly onCancel: () => void;
  readonly onConfirm: (reason: string) => void;
}

/**
 * Окно отказа: причина пишется там же, где принимается решение (ADR-300).
 *
 * 🔴 Не подтверждение с галочкой «уверены?», а поле ввода: подтверждать здесь
 * нечего, отказ обратим. Спрашивается то единственное, чего потом нигде не
 * восстановить, — за что отзыв убрали.
 *
 * 🔴 Кнопка отказа не заблокирована, пока причина коротка. Отключённая кнопка
 * не объясняет, чего от человека хотят: он видит серый прямоугольник и не
 * знает, мало он написал или что-то сломалось. Нажатие даёт ошибку под полем
 * — тот же порядок, что у остальных форм панели.
 */
export function RejectDialog({ open, name, busy = false, onCancel, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const close = (): void => {
    setReason('');
    setError('');
    onCancel();
  };

  const submit = (): void => {
    const trimmed = reason.trim();
    if (trimmed.length < REJECT_REASON_MIN) {
      setError(texts.reasonTooShort);
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={texts.rejectTitle(name)}
      description={texts.rejectDescription}
      size="sm"
      footer={
        <>
          <Button variant="bordered" onClick={close} disabled={busy}>
            {texts.rejectCancel}
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy}>
            {texts.rejectConfirm}
          </Button>
        </>
      }
    >
      <Textarea
        label={texts.reasonTitle}
        hint={texts.reasonHint}
        value={reason}
        rows={3}
        maxLength={REJECT_REASON_MAX}
        data-autofocus
        onChange={(event) => {
          setReason(event.target.value);
          if (error !== '') setError('');
        }}
        {...(error === '' ? {} : { error })}
      />
    </Modal>
  );
}
