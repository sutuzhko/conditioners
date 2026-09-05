'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { OrderStatus } from '@/entities/order/model';
import { Alert, Button, buttonClassName } from '@/shared/ui';

import { installerContent as own } from './installer-content';
import { handoverPath, installerStep } from './installer-model';
import { orderApi } from './lib';
import type { OrderApi, OrderFormStatus } from './model';
import styles from './OrderInstallerActions.module.css';

export interface OrderInstallerActionsProps {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly api?: OrderApi | undefined;
  /** Что делать после удачной правки. По умолчанию — перечитать страницу. */
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Что монтажник делает с нарядом дальше — липкая полоса второго кадра макета.
 *
 * 🔴 Одно действие на экране вместо выпадающего списка статусов. Переходов у
 * монтажника ровно два (CRM.md §6), и какой из них сейчас возможен, знает
 * статус наряда, а не человек в перчатках: выбор из списка на объекте — это
 * задача на внимание там, где её быть не должно.
 *
 * 🔴 «Работа выполнена» не закрывает наряд, а открывает сдачу. Закрыть выезд
 * без снимков и отчёта нельзя (issue #632), и кнопка честно говорит, что
 * будет дальше.
 *
 * Полоса липкая: на телефоне карточка наряда длиннее экрана, и действие,
 * уехавшее под сгиб, находят прокруткой каждый раз заново.
 */
export function OrderInstallerActions({
  orderId,
  status,
  api = orderApi,
  onChanged,
}: OrderInstallerActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [message, setMessage] = useState('');

  const step = installerStep(status);
  const sending = state === 'sending';

  const refresh = onChanged ?? ((): void => router.refresh());

  const take = async (): Promise<void> => {
    if (sending) return;

    setState('sending');
    setMessage('');

    const result = await api.setStatus(orderId, 'in_progress');

    if (result.ok) {
      setState('success');
      refresh();
      return;
    }

    setState('error');
    setMessage(result.message);
  };

  return (
    <div className={styles.bar}>
      {state === 'error' ? (
        <Alert tone="danger" title={message} live="assertive" className={styles.error} />
      ) : null}

      {step === 'take' ? (
        <>
          <Button size="lg" fullWidth loading={sending} onClick={() => void take()}>
            {sending ? own.taking : own.take}
          </Button>
          <p className={styles.hint}>{own.takeHint}</p>
        </>
      ) : null}

      {step === 'handover' ? (
        <>
          <Link
            className={buttonClassName({ size: 'lg', fullWidth: true })}
            href={{ pathname: handoverPath(orderId) }}
          >
            {own.finish}
          </Link>
          <p className={styles.hint}>{own.finishHint}</p>
        </>
      ) : null}

      {step === 'closed' ? (
        <>
          <Link
            className={buttonClassName({ variant: 'bordered', size: 'lg', fullWidth: true })}
            href={{ pathname: handoverPath(orderId) }}
          >
            {own.openHandover}
          </Link>
          <p className={styles.hint}>
            {own.closed}. {own.closedHint}
          </p>
        </>
      ) : null}

      {step === 'none' ? <p className={styles.hint}>{own.noStep}</p> : null}
    </div>
  );
}
