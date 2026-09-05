'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Button, Icon, useConfirm, type Confirm, type ConfirmRequest } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import { orderApi } from './lib';
import type { OrderApi } from './model';
import styles from './OrderTable.module.css';

type ToolProps = {
  readonly orderId: string;
  readonly number: number;
  /** Действия раздела: истории и тесты подменяют их, чтобы не поднимать сеть. */
  readonly api?: OrderApi | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно. */
  readonly confirm?: Confirm | undefined;
  /** Список перечитан после действия. Умолчание — обновление маршрута Next. */
  readonly onDone?: (() => void) | undefined;
};

export type OrderRemoveButtonProps = ToolProps;
export type OrderRestoreButtonProps = ToolProps;

/**
 * 🔴 Единственная причина, по которой в серверной таблице появляется
 * клиентский код: удаление и возврат отказа в работу обязаны спрашивать
 * подтверждение окном кита (ADR-113), а окно — это состояние. Всё остальное в
 * строке — ссылки, и платить за них бюджетом панели незачем.
 *
 * После действия страница перечитывается с сервера: список, счётчики вкладок и
 * строка счёта считаются там, и обновлять их по одному на клиенте значит
 * завести четыре источника правды об одном числе.
 */
function useRowAction(props: ToolProps): {
  readonly busy: boolean;
  readonly run: (ask: ConfirmRequest, act: () => Promise<{ ok: boolean }>) => Promise<void>;
  readonly dialog: ReactNode;
} {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);

  const request = props.confirm ?? confirm;
  const refresh = props.onDone ?? (() => router.refresh());

  const run = async (ask: ConfirmRequest, act: () => Promise<{ ok: boolean }>): Promise<void> => {
    if (busy) return;
    if (!(await request(ask))) return;

    setBusy(true);
    const result = await act();
    setBusy(false);

    if (result.ok) refresh();
  };

  return { busy, run, dialog };
}

/**
 * Удаление наряда из строки списка (issue #595, ADR-307 §4).
 *
 * 🔴 Удаление и отказ — разные вещи, и подтверждение говорит об этом прямо:
 * отменённая работа остаётся в истории и в счётчиках воронки, удалённая
 * исчезает вместе с деньгами и позициями.
 */
export function OrderRemoveButton({ orderId, number, api = orderApi, confirm, onDone }: ToolProps) {
  const tool = useRowAction({ orderId, number, api, confirm, onDone });

  return (
    <>
      <button
        className={`${styles.action} ${styles.danger}`}
        type="button"
        disabled={tool.busy}
        aria-label={texts.rowRemove(number)}
        onClick={() => {
          void tool.run(
            {
              title: texts.removeTitle(number),
              description: texts.removeText,
              confirmLabel: texts.removeConfirm,
            },
            () => api.remove(orderId),
          );
        }}
      >
        <span aria-hidden="true" title={texts.rowRemove(number)}>
          <Icon name="close" size={18} />
        </span>
      </button>

      {tool.dialog}
    </>
  );
}

/**
 * Возврат отказа в работу — действие вкладки «Отказы» (issue #597).
 *
 * Отказ не удаляет наряд, и передумавший клиент не должен стоить владельцу
 * повторного заведения работы. «Новый» — это и есть «исполнителя нет»: наряд
 * возвращается в ту стопку, из которой ушёл, а причину отказа гасит сервер,
 * потому что причина без отказа читается как действующая (ADR-310).
 */
export function OrderRestoreButton({
  orderId,
  number,
  api = orderApi,
  confirm,
  onDone,
}: ToolProps) {
  const tool = useRowAction({ orderId, number, api, confirm, onDone });

  return (
    <>
      <Button
        size="sm"
        variant="bordered"
        disabled={tool.busy}
        aria-label={texts.restoreRowLabel(number)}
        onClick={() => {
          void tool.run(
            {
              title: texts.restoreAskTitle(number),
              description: texts.restoreAskText,
              confirmLabel: texts.restoreAskConfirm,
            },
            () => api.restore(orderId),
          );
        }}
      >
        {texts.restoreRow}
      </Button>

      {tool.dialog}
    </>
  );
}
