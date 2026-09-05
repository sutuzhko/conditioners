'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon, RowMenu, useConfirm, type Confirm, type RowMenuItem } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import { stockApi } from './lib';
import {
  itemDraftOf,
  stockItemPath,
  stockMovePath,
  type StockApi,
  type StockItemCard,
} from './model';
import styles from './StockRowMenu.module.css';

export interface StockRowMenuProps {
  readonly item: StockItemCard;
  /** Перемещать некуда, пока незакрытая зона одна: пункт тогда отключён. */
  readonly movable?: boolean | undefined;
  readonly api?: StockApi | undefined;
  /** Шов для тестов: настоящее окно подтверждения ждёт клика человека. */
  readonly confirmArchive?: Confirm | undefined;
}

/**
 * Действия над позицией склада прямо из строки (issue #573).
 *
 * 🔴 Счёт владельца был именно к этому разделу: «нельзя удалять и
 * переименовывать». Действия существовали — но только внутри карточки, и из
 * списка о них ничто не сообщало. Меню строки повторяет набор карточки.
 *
 * 🔴 Удаления здесь нет и не будет: позиция сдаётся в архив (ADR-134).
 * Удаление унесло бы журнал движений — то, ради чего склад и заводится.
 * Отступление от макета записано в PIXEL_SPEC §«Панель» (issue #576), чтобы
 * следующая сессия не «починила» его обратно.
 *
 * 🔴 Меню, а не круглые кнопки: так нарисовано в макете (design/admin,
 * `Stock.body.html` — кебаб в колонке шириной 44px). У остатков шесть колонок
 * зон, и три кнопки в каждой строке отняли бы у них место.
 */
export function StockRowMenu({
  item,
  movable = true,
  api = stockApi,
  confirmArchive,
}: StockRowMenuProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmArchive ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  /** Архив вместо удаления: журнал движений остаётся (ADR-134). */
  const archive = async (): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.itemArchiveConfirm(item.name)))) return;

    setBusy(true);
    setMessage('');

    const result = await api.archiveItem(item.id);
    setBusy(false);

    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  /** Возврат из архива — обычная правка: тот же PATCH, только флагом. */
  const restore = async (): Promise<void> => {
    if (busy) return;

    setBusy(true);
    setMessage('');

    const result = await api.updateItem(item.id, { ...itemDraftOf(item), archived: false });
    setBusy(false);

    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  /* Переходы остаются переходами: пункт меню зовёт маршрутизатор, а не
     подменяет ссылку. Открыть карточку в новой вкладке из меню нельзя — это
     цена самого меню, и потому имя позиции в строке осталось ссылкой. */
  const items: readonly RowMenuItem[] = [
    {
      id: 'edit',
      label: texts.rowEdit,
      icon: <Icon name="edit" size={16} />,
      disabled: busy,
      onSelect: () => router.push(stockItemPath(item.id)),
    },
    {
      id: 'move',
      label: texts.moveRow,
      icon: <Icon name="stock" size={16} />,
      disabled: busy || !movable,
      onSelect: () => router.push(stockMovePath({ item: item.id, kind: 'transfer' })),
    },
    item.archived
      ? {
          id: 'restore',
          label: texts.itemRestore,
          icon: <Icon name="check" size={16} />,
          disabled: busy,
          onSelect: () => void restore(),
        }
      : {
          id: 'archive',
          label: texts.itemArchive,
          icon: <Icon name="trash" size={16} />,
          disabled: busy,
          danger: true,
          onSelect: () => void archive(),
        },
  ];

  return (
    <span className={styles.root}>
      <RowMenu items={items} label={texts.rowActions(item.name)} />

      {message === '' ? null : (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}

      {dialog}
    </span>
  );
}
