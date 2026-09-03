'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { ORDER_CARD_TAB_TITLE, orderManagerContent as texts } from './content';
import { ORDER_CARD_TABS, orderCardTabFromParam, type OrderCardTab } from './model';
import styles from './OrderWorkTabs.module.css';

export interface OrderWorkTabsProps {
  /**
   * Вкладка, разобранная страницей на сервере: карточка приходит открытой на
   * ней, без мигания первой (issue #340).
   */
  readonly active: OrderCardTab;
  /** Содержимое вкладок приходит готовым: разметку собирает страница. */
  readonly job: ReactNode;
  readonly checklist: ReactNode;
  readonly documents: ReactNode;
}

/**
 * Работа с нарядом в трёх вкладках.
 *
 * 🔴 Вкладка живёт в адресе (issue #339): ссылку на «Чеклист» отправляют
 * монтажнику, «назад» возвращает на предыдущую вкладку, а не выбрасывает из
 * карточки (issue #342).
 *
 * 🔴 Адрес меняется `history.pushState`, а не переходом роутера. Данные всех
 * трёх вкладок карточка уже получила — наряд, чеклист, документы приходят
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
export function OrderWorkTabs({ active, job, checklist, documents }: OrderWorkTabsProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const tabsRef = useRef<Map<OrderCardTab, HTMLButtonElement>>(new Map());

  /* Пока браузер не тронул адрес, верно то, что разобрал сервер: `has`, а не
     `get`, — иначе первое же переключение обратно на «Наряд» вернуло бы
     вкладку, с которой карточку открыли. */
  const current = params.has('tab') ? orderCardTabFromParam(params.get('tab')) : active;

  const select = (tab: OrderCardTab): void => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', tab);

    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };

  const focus = (tab: OrderCardTab): void => {
    select(tab);
    tabsRef.current.get(tab)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = ORDER_CARD_TABS.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(ORDER_CARD_TABS[index === last ? 0 : index + 1] ?? 'job');
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(ORDER_CARD_TABS[index === 0 ? last : index - 1] ?? 'job');
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focus('job');
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focus(ORDER_CARD_TABS[last] ?? 'job');
    }
  };

  const panels: Record<OrderCardTab, ReactNode> = { job, checklist, documents };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={texts.workTabsLabel}>
        {ORDER_CARD_TABS.map((tab, index) => (
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

      {ORDER_CARD_TABS.map((tab) => (
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
