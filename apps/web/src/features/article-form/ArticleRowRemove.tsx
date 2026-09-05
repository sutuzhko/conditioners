'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon, TableAction, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { articleFormContent as texts } from './content';
import { deleteArticle } from './lib';
import type { ArticleDelete } from './model';
import styles from './ArticleRowRemove.module.css';

export interface ArticleRowRemoveProps {
  readonly id: string;
  /** Заголовок статьи: подпись у каждой строки своя, иначе десять «Удалить». */
  readonly title: string;
  /** Шов для историй и тестов; по умолчанию — `DELETE /api/admin/articles/{id}`. */
  readonly remove?: ArticleDelete | undefined;
  /** Подтверждение подменяется в тестах: настоящее окно ждёт клика человека. */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Удаление статьи прямо из списка базы знаний (issue #573, #575).
 *
 * 🔴 Набор действий строки повторяет набор карточки. До сих пор список давал
 * только «Править», и о том, что статью вообще можно убрать, узнавал лишь
 * тот, кто открыл карточку и долистал до низа формы.
 *
 * 🔴 Спрашивает диалог кита, а не окно браузера (ADR-113): удаление статьи
 * уносит и её адрес, а этого системное окно не объяснит.
 */
export function ArticleRowRemove({
  id,
  title,
  remove = () => deleteArticle(id),
  confirmRemove,
}: ArticleRowRemoveProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handle = async (): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.removeConfirm(title)))) return;

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
        label={texts.removeLabel(title)}
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
