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
  type OrderCardTab,
  type OrderDetails,
} from '@/features/order-manager';

export interface OrderWorkProps {
  readonly order: OrderDetails;
  /** Открытая вкладка: её разобрала страница на сервере (issue #340). */
  readonly tab: OrderCardTab;
  /** Монтажник: место установки только смотрит, документы не правит. */
  readonly forInstaller?: boolean | undefined;
  /**
   * Расход материалов. Приходит готовым узлом со страницы: блок читает склад
   * сам, а собрать его здесь значило бы протащить через границу сервер→клиент
   * начальные движения и справочник, которые страница уже прочитала.
   */
  readonly materials: ReactNode;
  /** 🔴 История — только владельцу: монтажнику её не отдаёт сервер (ADR-114). */
  readonly history?: ReactNode | undefined;
  /** Вкладка «Наряд»: форма владельца или карточка монтажника. */
  readonly children: ReactNode;
}

/**
 * Работа с нарядом: пять вкладок и итог работ (issue #346).
 *
 * 🔴 Клиентский лист существует по той же причине, что и `OrderEditor`:
 * функция не переживает границу сервер→клиент, а действиям наряда нужен и
 * набор запросов, и обновление страницы после удачной правки. Сами данные
 * приходят с сервера — состав чеклиста, документов и снимков живёт в базе, а
 * не в памяти компонента.
 */
export function OrderWork({
  order,
  tab,
  forInstaller = false,
  materials,
  history,
  children,
}: OrderWorkProps) {
  const router = useRouter();
  const api = orderWorkApi(order.id);
  const refresh = (): void => router.refresh();

  return (
    <OrderWorkTabs
      active={tab}
      job={
        <>
          {children}

          {/* 🔴 У монтажника итог живёт не здесь, а на экране сдачи работы
              (issue #632): фото, отчёт и оплата — одно действие, а не три
              места, из которых он собирает его по памяти. Владельцу форма
              остаётся тут: он правит уже сданный отчёт. */}
          {forInstaller ? null : (
            <OrderResultForm
              api={api}
              extraWork={order.extraWork}
              report={order.report}
              resultAt={order.resultAt}
              onSaved={refresh}
            />
          )}
        </>
      }
      materials={materials}
      checklist={<OrderChecklist api={api} items={order.checklist} onChanged={refresh} />}
      documents={
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
      history={history}
    />
  );
}
