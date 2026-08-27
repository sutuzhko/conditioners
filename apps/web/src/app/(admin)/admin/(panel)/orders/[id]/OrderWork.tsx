'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  OrderChecklist,
  OrderDocs,
  OrderPhotos,
  OrderResultForm,
  OrderWorkTabs,
  orderWorkApi,
  type OrderDetails,
} from '@/features/order-manager';

export interface OrderWorkProps {
  readonly order: OrderDetails;
  /** Монтажник: место установки только смотрит, документы не правит. */
  readonly forInstaller?: boolean | undefined;
  /** Вкладка «Наряд»: форма владельца или карточка монтажника. */
  readonly children: ReactNode;
}

/**
 * Работа с нарядом: три вкладки и итог работ.
 *
 * 🔴 Клиентский лист существует по той же причине, что и `OrderEditor`:
 * функция не переживает границу сервер→клиент, а действиям наряда нужен и
 * набор запросов, и обновление страницы после удачной правки. Сами данные
 * приходят с сервера — состав чеклиста, документов и снимков живёт в базе, а
 * не в памяти компонента.
 */
export function OrderWork({ order, forInstaller = false, children }: OrderWorkProps) {
  const router = useRouter();
  const api = orderWorkApi(order.id);
  const refresh = (): void => router.refresh();

  return (
    <OrderWorkTabs
      order={
        <>
          {children}

          {/* 🔴 Итог заполняют обе роли: это отчёт монтажника о выезде. */}
          <OrderResultForm
            api={api}
            extraWork={order.extraWork}
            report={order.report}
            resultAt={order.resultAt}
            onSaved={refresh}
          />
        </>
      }
      checklist={<OrderChecklist api={api} items={order.checklist} onChanged={refresh} />}
      files={
        <>
          <OrderDocs api={api} docs={order.docs} editable={!forInstaller} onChanged={refresh} />
          <OrderPhotos
            api={api}
            photos={order.photos}
            forInstaller={forInstaller}
            onChanged={refresh}
          />
        </>
      }
    />
  );
}
