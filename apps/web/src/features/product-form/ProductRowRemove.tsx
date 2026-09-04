'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon, TableAction, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { productFormContent as texts } from './content';
import { deleteProduct } from './lib';
import type { ProductDelete } from './model';
import styles from './ProductRowRemove.module.css';

export interface ProductRowRemoveProps {
  readonly id: string;
  /** Название модели: подпись у каждой строки своя, иначе десять «Удалить». */
  readonly name: string;
  /** Шов для историй и тестов; по умолчанию — `DELETE /api/admin/models/{id}`. */
  readonly remove?: ProductDelete | undefined;
  /** Подтверждение подменяется в тестах: настоящее окно ждёт клика человека. */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Удаление модели прямо из списка каталога (issue #573, #575).
 *
 * 🔴 Действие, до которого нельзя добраться из строки, для владельца не
 * существует: он открывал карточку, чтобы узнать, что там есть «Удалить».
 * Набор строки повторяет набор карточки — расхождение здесь читается как
 * «в списке этого нельзя», а не как упрощение.
 *
 * 🔴 Спрашивает диалог кита, а не окно браузера (ADR-113): системное окно
 * выглядит одинаково для «удалить фотографию» и «удалить модель», и человек
 * соглашается, не прочитав.
 *
 * Отказ сервера остаётся на экране словами: молчание после нажатия читается
 * как «удалилось», а строка при этом на месте.
 */
export function ProductRowRemove({
  id,
  name,
  remove = () => deleteProduct(id),
  confirmRemove,
}: ProductRowRemoveProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handle = async (): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.removeConfirm(name)))) return;

    setBusy(true);
    setMessage('');

    const result = await remove();

    setBusy(false);
    if (result.ok) {
      /* Список серверный: без сброса кеша маршрутизатора удалённая строка
         останется на экране до перезагрузки страницы. */
      router.refresh();
      return;
    }

    setMessage(result.message ?? texts.serverError);
  };

  return (
    <span className={styles.root}>
      <TableAction
        tone="remove"
        label={texts.removeLabel(name)}
        icon={<Icon name="trash" size={16} />}
        disabled={busy}
        onClick={() => void handle()}
      />

      {message === '' ? null : (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}

      {dialog}
    </span>
  );
}
