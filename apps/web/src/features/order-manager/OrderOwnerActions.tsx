'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { OrderCard } from '@/entities/order/model';
import {
  Alert,
  Badge,
  Button,
  RowMenu,
  buttonClassName,
  useConfirm,
  type Confirm,
} from '@/shared/ui';

import { ORDER_STATUS_TITLE, ORDER_STATUS_VARIANT, orderManagerContent as texts } from './content';
import { orderApi } from './lib';
import { ORDERS_PATH, orderCanMarkDone, type OrderApi, type OrderFormStatus } from './model';
import styles from './OrderOwnerActions.module.css';

export interface OrderOwnerActionsProps {
  readonly order: OrderCard;
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: OrderApi | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно. */
  readonly confirm?: Confirm | undefined;
  /** Что делать после удачной правки. По умолчанию — перечитать страницу. */
  readonly onChanged?: (() => void) | undefined;
  /** Куда уходить после удаления. По умолчанию — в список нарядов. */
  readonly onRemoved?: (() => void) | undefined;
}

/**
 * Шапка действий карточки наряда — макет `Order.png` (issue #598).
 *
 * 🔴 Два действия на виду, опасное — в меню. Макет держит в шапке пару
 * «вторичная кнопка + первичная», и здесь она та же: правка обводкой,
 * закрытие наряда заливкой. Удаление уехало под «⋯» намеренно — кнопка,
 * стоящая рядом с той, которую нажимают каждый день, однажды будет нажата
 * вместо неё.
 *
 * 🔴 Меню не пустое. Макет рисует «⋯» и не раскрывает его содержимого, а
 * кнопок правки и удаления не рисует вовсе — но раздел обязан давать полный
 * набор действий над своими данными (ADR-307), и многоточие без пунктов
 * читалось бы как забытая кнопка.
 *
 * 🔴 Печати документов здесь нет, и это не пропуск: печатать нечего. Сборка
 * акта в макете нарисована («Собрать»), но в продукте её не существует — ни
 * маршрута, ни шаблона, ни единого правила `@media print` во всём приложении.
 * Кнопка, открывающая диалог печати поверх панели с колонкой разделов, — не
 * «печать документов», а её видимость. Пробел заведён отдельной задачей.
 *
 * 🔴 Правка — ссылка, а не кнопка с переходом: адрес панели обязан
 * открываться в новой вкладке средней кнопкой, как всякий другой.
 */
export function OrderOwnerActions({
  order,
  api = orderApi,
  confirm,
  onChanged,
  onRemoved,
}: OrderOwnerActionsProps) {
  const router = useRouter();
  const { confirm: ask, dialog } = useConfirm();
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [removed, setRemoved] = useState(false);

  const askRemove = confirm ?? ask;
  const sending = state === 'sending';
  const busy = sending || removed;

  /* Переходы по умолчанию живут здесь, а не в обёртке вокруг компонента:
     шапка серверной карточки не может передать функцию через границу, а
     заводить ради этого ещё один клиентский лист незачем — этот уже клиентский.
     Истории и тесты подменяют оба действия пропами. */
  const refresh = onChanged ?? ((): void => router.refresh());
  const leave = onRemoved ?? ((): void => router.push(ORDERS_PATH));

  const markDone = async (): Promise<void> => {
    if (busy) return;

    setState('sending');
    setMessage('');

    const result = await api.setStatus(order.id, 'done');

    if (result.ok) {
      setState('success');
      refresh();
      return;
    }

    setState('error');
    setMessage(result.message);
  };

  const remove = async (): Promise<void> => {
    if (busy) return;

    const confirmed = await askRemove({
      title: texts.removeTitle(order.number),
      description: texts.removeText,
      confirmLabel: texts.removeConfirm,
    });
    if (!confirmed) return;

    setState('sending');
    setMessage('');

    const result = await api.remove(order.id);

    if (result.ok) {
      setState('idle');
      setRemoved(true);
      leave();
      return;
    }

    setState('error');
    setMessage(result.message);
  };

  return (
    <div className={styles.head}>
      {/* Чипы состояния: что за работа и в каком она состоянии — первый
          вопрос того, кто открыл карточку. */}
      <div className={styles.marks}>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]} dot>
          {ORDER_STATUS_TITLE[order.status]}
        </Badge>
        <Badge variant="neutral">{order.workType.title}</Badge>
        {order.address === '' ? null : <span className={styles.address}>{order.address}</span>}
      </div>

      <div className={styles.actions}>
        {state === 'success' ? (
          <span className={styles.ok} role="status">
            {texts.markDoneDone}
          </span>
        ) : null}

        {removed ? (
          <span className={styles.ok} role="status">
            {texts.removed}
          </span>
        ) : null}

        <Link
          className={`${buttonClassName({ variant: 'bordered', size: 'sm' })} ${styles.action}`}
          href={{ pathname: `/admin/orders/${order.id}/edit` }}
        >
          {texts.edit}
        </Link>

        {orderCanMarkDone(order.status) ? (
          <Button
            className={styles.primary}
            size="sm"
            loading={sending}
            disabled={busy}
            onClick={() => void markDone()}
          >
            {sending ? texts.markingDone : texts.markDone}
          </Button>
        ) : null}

        <RowMenu
          label={texts.cardActions(order.number)}
          items={[
            {
              id: 'remove',
              label: texts.remove,
              danger: true,
              disabled: busy,
              onSelect: () => void remove(),
            },
          ]}
        />
      </div>

      {state === 'error' && message !== '' ? (
        <Alert tone="danger" title={message} live="assertive" className={styles.error} />
      ) : null}

      {dialog}
    </div>
  );
}
