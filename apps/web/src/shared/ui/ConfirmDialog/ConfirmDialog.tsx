'use client';

import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';
import type { ConfirmRequest } from './model';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly request: ConfirmRequest | null;
  /** `true` — человек подтвердил, `false` — отказался или закрыл окно. */
  readonly onResolve: (confirmed: boolean) => void;
}

/**
 * Подтверждение необратимого действия.
 *
 * 🔴 Заменяет `window.confirm` (ADR-113): системное окно нельзя оформить, в
 * нём нельзя объяснить последствия, и оно одинаково выглядит для «удалить
 * фотографию» и «удалить учётную запись».
 *
 * Умолчания микрокопии — кита, не фичи (ADR-099): «Отмена» одинакова везде,
 * а вот опасная кнопка обязана называть действие своим словом, поэтому
 * `confirmLabel` без умолчания.
 *
 * Действие по умолчанию — отказ: первым в окне стоит крестик закрытия, на
 * него и уходит фокус, Escape и клик мимо окна тоже отменяют. Подтвердить
 * можно только нажав на опасную кнопку.
 *
 * Крестик остаётся «Закрыть», а не берёт подпись отмены: две кнопки с одним
 * именем читалка объявляет одинаково, и человек не понимает, куда попал.
 */
export function ConfirmDialog({ open, request, onResolve }: ConfirmDialogProps) {
  if (request === null) return null;

  return (
    <Modal
      open={open}
      onClose={() => onResolve(false)}
      title={request.title}
      description={request.description}
      size="sm"
      footer={
        <>
          <Button variant="bordered" onClick={() => onResolve(false)}>
            {request.cancelLabel ?? 'Отмена'}
          </Button>
          <Button variant="danger" onClick={() => onResolve(true)}>
            {request.confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
}
