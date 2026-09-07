'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ORDER_CARD_TAB_TITLE,
  OrderChecklist,
  OrderDocs,
  OrderPhotos,
  orderCardTabCounts,
  orderCardTabsFor,
  orderManagerContent as texts,
  orderWorkApi,
  type OrderCardTab,
  type OrderDetails,
} from '@/features/order-manager';

import { PanelTabs } from '../../PanelTabs';

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
 * Работа с нарядом: пять вкладок и итог работ (issue #346).
 *
 * 🔴 Лента — общая `PanelTabs` раздела, а не своя (issue #598). Своя стояла
 * здесь с issue #346 и была вкладками карточки клиента слово в слово: тот же
 * `pushState` вместо перехода, те же стрелки, те же скрытые панели. Разошлись
 * они ровно на том, ради чего задача и заведена, — на счётчиках: у общей они
 * были, у этой копии нет. Лента вместо переноса переехала в общую параметром
 * `scrollable`: пять подписей на 390 в строку не помещаются, а трём вкладкам
 * карточки клиента лента не мешает — она там просто не включается.
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

  return (
    <PanelTabs
      active={tab}
      tabs={tabs}
      titles={ORDER_CARD_TAB_TITLE}
      label={texts.workTabsLabel}
      idPrefix="order"
      scrollable
      counts={orderCardTabCounts(order, materialsCount)}
      panels={{
        /* 🔴 Итог работ уехал внутрь карточки владельца, в её левую колонку
           (issue #598): по макету он стоит там же, где объект и оборудование,
           а не отдельным хвостом под ними. У монтажника его здесь нет и не
           было — он сдаёт выезд на своём экране (issue #632). */
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
      }}
    />
  );
}
