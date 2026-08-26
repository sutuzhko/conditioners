'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { ConfirmDialog } from './ConfirmDialog';
import type { Confirm, ConfirmRequest } from './model';

type Pending = {
  readonly request: ConfirmRequest;
  readonly settle: (confirmed: boolean) => void;
};

export interface ConfirmControl {
  /** Спросить и дождаться ответа. */
  readonly confirm: Confirm;
  /** Само окно — его нужно вывести в разметке компонента. */
  readonly dialog: ReactNode;
}

/**
 * Подтверждение необратимого действия одним вызовом.
 *
 * ```tsx
 * const { confirm, dialog } = useConfirm();
 * …
 * if (!(await confirm({ title: 'Удалить статью?', confirmLabel: 'Удалить' }))) return;
 * …
 * return (<>{dialog}</>);
 * ```
 *
 * 🔴 Один диалог на проект (ADR-113): семь мест звали `window.confirm`, и
 * каждое собрало бы своё окно, разойдясь в поведении на первой же правке.
 *
 * Незакрытое окно у размонтированного компонента оставляет обещание
 * неразрешённым — и это правильная сторона отказа: код после `await` не
 * продолжится, то есть удаление не случится.
 */
export function useConfirm(): ConfirmControl {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        setPending({ request, settle: resolve });
      }),
    [],
  );

  const resolve = (confirmed: boolean): void => {
    if (pending === null) return;
    pending.settle(confirmed);
    setPending(null);
  };

  return {
    confirm,
    dialog: (
      <ConfirmDialog
        open={pending !== null}
        request={pending?.request ?? null}
        onResolve={resolve}
      />
    ),
  };
}
