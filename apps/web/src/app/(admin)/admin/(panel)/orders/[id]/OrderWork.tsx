'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ORDER_CARD_TAB_TITLE,
  OrderChecklist,
  OrderDocs,
  OrderPhotos,
  orderCardTabCountLabel,
  orderCardTabCounts,
  orderCardTabsFor,
  orderManagerContent as texts,
  orderWorkApi,
  type OrderCardTab,
  type OrderDetails,
} from '@/features/order-manager';
import { TabPanels } from '@/shared/ui';

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
  /**
   * Сколько движений склада по наряду — для счётчика вкладки. Отдельным
   * числом, а не выводом из узла: узел уже собран, и заглянуть в него нельзя.
   */
  readonly materialsCount?: number | undefined;
  /** 🔴 История — только владельцу: монтажнику её не отдаёт сервер (ADR-114). */
  readonly history?: ReactNode | undefined;
  /** Вкладка «Наряд»: карточка чтения владельца или карточка монтажника. */
  readonly children: ReactNode;
}

/**
 * Работа с нарядом: пять вкладок и итог работ (issue #346, #598).
 *
 * 🔴 Лента — общая вкладка кита, а не своя (issue #584, #598). Своя стояла
 * здесь с issue #346 и была вкладками карточки клиента слово в слово: тот же
 * `pushState` вместо перехода, те же стрелки, те же скрытые панели. Прокрутку
 * включать не нужно: лента с панелями клиентская и едет вбок всегда, подвозя
 * открытую вкладку к глазам, — а пять подписей на 390 в строку не помещаются.
 *
 * 🔴 Клиентский лист существует потому, что функция не переживает границу
 * сервер→клиент, а действиям наряда нужен и набор запросов, и обновление
 * страницы после удачной правки. Сами данные приходят с сервера.
 */
export function OrderWork({
  order,
  tab,
  forInstaller = false,
  materials,
  materialsCount,
  history,
  children,
}: OrderWorkProps) {
  const router = useRouter();
  const api = orderWorkApi(order.id);
  const refresh = (): void => router.refresh();

  /* Набор вкладок задаёт роль, а панели — то, что дала страница: истории у
     монтажника нет ни в разметке, ни в ленте. */
  const tabs = orderCardTabsFor(forInstaller);
  const counts = orderCardTabCounts(order, materialsCount);

  const panels: Readonly<Record<OrderCardTab, ReactNode>> = {
    /* 🔴 Итог работ уехал внутрь карточки владельца, в её левую колонку
       (issue #598): по макету он стоит там же, где объект и оборудование, а не
       отдельным хвостом под ними. У монтажника его здесь нет и не было — он
       сдаёт выезд на своём экране (issue #632). */
    job: children,
    materials,
    checklist: <OrderChecklist api={api} items={order.checklist} onChanged={refresh} />,
    documents: (
      <>
        <OrderDocs api={api} docs={order.docs} editable={!forInstaller} onChanged={refresh} />
        <OrderPhotos
          api={api}
          photos={order.photos}
          forInstaller={forInstaller}
          onChanged={refresh}
        />
      </>
    ),
    history,
  };

  return (
    <TabPanels
      items={tabs.map((key) => {
        const count = counts[key];

        return {
          key,
          title: ORDER_CARD_TAB_TITLE[key],
          panel: panels[key],
          /* Счётчик приходит парой «число + фраза»: тип кита не даёт передать
             цифру, забыв, чего именно она считает. */
          ...(count === undefined ? {} : { count, countLabel: orderCardTabCountLabel(key, count) }),
        };
      })}
      active={tab}
      label={texts.workTabsLabel}
      idPrefix="order"
    />
  );
}
