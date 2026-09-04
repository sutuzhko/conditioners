'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { ORDER_CARD_TAB_TITLE, orderManagerContent as texts } from './content';
import {
  INSTALLER_CARD_TABS,
  ORDER_CARD_TABS,
  orderCardTabFromParam,
  type OrderCardTab,
} from './model';
import styles from './OrderWorkTabs.module.css';

export interface OrderWorkTabsProps {
  /**
   * Вкладка, разобранная страницей на сервере: карточка приходит открытой на
   * ней, без мигания первой (issue #340).
   */
  readonly active: OrderCardTab;
  /** Содержимое вкладок приходит готовым: разметку собирает страница. */
  readonly job: ReactNode;
  readonly materials: ReactNode;
  readonly checklist: ReactNode;
  readonly documents: ReactNode;
  /**
   * 🔴 История — только владельцу. Ключа нет — нет и вкладки: монтажнику
   * сервер историю не отдаёт вовсе (ADR-114), и пустая вкладка обещала бы
   * пустую историю вместо закрытой.
   */
  readonly history?: ReactNode | undefined;
}

/**
 * Работа с нарядом в пяти вкладках (issue #346): наряд, расход, чеклист,
 * документы, история.
 *
 * 🔴 Вкладка живёт в адресе (issue #339): ссылку на «Чеклист» отправляют
 * монтажнику, «назад» возвращает на предыдущую вкладку, а не выбрасывает из
 * карточки (issue #342).
 *
 * 🔴 Адрес меняется `history.pushState`, а не переходом роутера. Данные всех
 * вкладок карточка уже получила — наряд, расход, чеклист, документы приходят
 * одним запросом страницы, — и переход заставил бы сервер собрать её заново:
 * клиенты, монтажники, занятость, склад. Платил бы за это монтажник у машины,
 * которому вкладку нужно просто посмотреть. Next такой адрес подхватывает:
 * `useSearchParams` обновляется и на нашем переключении, и на «назад».
 *
 * Панели рисуются все сразу и прячутся атрибутом `hidden`, а не
 * размонтируются: переключение вкладки не должно терять наполовину
 * заполненный отчёт о выезде и выбранный файл документа.
 *
 * Клавиатура работает как положено вкладкам: стрелки переводят фокус, Home и
 * End — к краям.
 */
export function OrderWorkTabs({
  active,
  job,
  materials,
  checklist,
  documents,
  history,
}: OrderWorkTabsProps) {
  const params = useSearchParams();
  const tabsRef = useRef<Map<OrderCardTab, HTMLButtonElement>>(new Map());

  /* Набор вкладок задают переданные панели, а не роль строкой: компонент не
     знает, кто смотрит, и знать не должен — он знает, что ему дали. */
  const tabs = history === undefined ? INSTALLER_CARD_TABS : ORDER_CARD_TABS;

  /* Пока браузер не тронул адрес, верно то, что разобрал сервер: `has`, а не
     `get`, — иначе первое же переключение обратно на «Наряд» вернуло бы
     вкладку, с которой карточку открыли. */
  const current = params.has('tab') ? orderCardTabFromParam(params.get('tab'), tabs) : active;

  /* 🔴 Пять вкладок в строку на 390 не помещаются: лента прокручивается, и
     открытую нужно подвезти к глазам. Иначе ссылка на «Историю» открывает
     карточку, у которой видно «Наряд» и «Расход», а подсвеченной вкладки нет
     вовсе. Прокручивается только лента: `block: 'nearest'` не даёт странице
     прыгнуть к вкладкам с самого верха карточки. */
  useEffect(() => {
    tabsRef.current.get(current)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  /* 🔴 Адрес строится из текущего, а не из `usePathname` с параметрами: в
     витрине путь роутера подменён на «/», и переключение вкладки внутри
     истории переписало бы адрес кадра, потеряв `id` и `viewMode`. Здесь
     меняется ровно один параметр того адреса, который открыт. */
  const write = (tab: OrderCardTab, mode: 'push' | 'replace'): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);

    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };

  const select = (tab: OrderCardTab): void => {
    write(tab, 'push');
  };

  /* 🔴 Стрелки водят фокус и открывают вкладку, но записи в историю не
     оставляют. Иначе проход Наряд → Расход → Чеклист кладёт туда три записи,
     и «назад» после этого выводит из карточки по одному нажатию клавиши —
     ровно то, от чего избавляет issue #342. */
  const focus = (tab: OrderCardTab): void => {
    write(tab, 'replace');
    tabsRef.current.get(tab)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = tabs.length - 1;
    const first = tabs[0] ?? 'job';

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(tabs[index === last ? 0 : index + 1] ?? first);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(tabs[index === 0 ? last : index - 1] ?? first);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focus(first);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focus(tabs[last] ?? first);
    }
  };

  const panels: Record<OrderCardTab, ReactNode> = {
    job,
    materials,
    checklist,
    documents,
    history,
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.strip}>
        <div className={styles.tabs} role="tablist" aria-label={texts.workTabsLabel}>
          {tabs.map((tab, index) => (
            <button
              key={tab}
              ref={(node) => {
                if (node === null) tabsRef.current.delete(tab);
                else tabsRef.current.set(tab, node);
              }}
              type="button"
              role="tab"
              id={`order-tab-${tab}`}
              className={[styles.tab, current === tab ? styles.current : null]
                .filter(Boolean)
                .join(' ')}
              aria-selected={current === tab}
              aria-controls={`order-panel-${tab}`}
              /* Из ленты табов выпадают все, кроме выбранного: Tab уводит на
                 панель, а между вкладками ходят стрелками. */
              tabIndex={current === tab ? 0 : -1}
              onClick={() => select(tab)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {ORDER_CARD_TAB_TITLE[tab]}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`order-panel-${tab}`}
          className={styles.panel}
          aria-labelledby={`order-tab-${tab}`}
          hidden={current !== tab}
          tabIndex={0}
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  );
}
