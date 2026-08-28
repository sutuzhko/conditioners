'use client';

import { useRouter } from 'next/navigation';

import {
  OrderForm,
  type OrderBlock,
  type OrderWorkSpan,
  type OrderClientRef,
  type OrderDraft,
  type OrderFormSurface,
  type OrderInstallerRef,
} from '@/features/order-manager';

export interface OrderEditorProps {
  readonly clients: readonly OrderClientRef[];
  readonly installers: readonly OrderInstallerRef[];
  /** Занятость: форма предупреждает о ней, но назначать не мешает (ADR-115). */
  readonly blocks?: readonly OrderBlock[] | undefined;
  readonly work?: readonly OrderWorkSpan[] | undefined;
  readonly orderId?: string | undefined;
  readonly orderNumber?: number | undefined;
  readonly initial?: OrderDraft | undefined;
  readonly title?: string | undefined;
  readonly hint?: string | undefined;
  readonly removable?: boolean | undefined;
  /** Своя карточка с заголовком или только поля: заголовок даёт страница. */
  readonly surface?: OrderFormSurface | undefined;
}

/**
 * Клиентский лист вокруг формы наряда.
 *
 * 🔴 Он существует потому, что функция не переживает границу сервер→клиент:
 * серверная страница не может передать `onSaved` и `onRemoved` напрямую —
 * рендер всей страницы упадёт. Форма же не должна знать, откуда её открыли,
 * поэтому переходы остаются снаружи, а снаружи — здесь.
 */
export function OrderEditor({
  clients,
  installers,
  blocks,
  work,
  orderId,
  orderNumber,
  initial,
  title,
  hint,
  removable,
  surface,
}: OrderEditorProps) {
  const router = useRouter();

  return (
    <OrderForm
      clients={clients}
      installers={installers}
      blocks={blocks}
      work={work}
      orderId={orderId}
      orderNumber={orderNumber}
      initial={initial}
      title={title}
      hint={hint}
      removable={removable}
      surface={surface}
      onSaved={(id) => {
        /* Заведение уводит в созданный наряд, правка остаётся на месте и
           только освежает данные: человек продолжает смотреть тот же экран. */
        if (id === null) router.refresh();
        else router.push(`/admin/orders/${id}`);
      }}
      onRemoved={() => router.push('/admin/orders')}
    />
  );
}
