'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { orderManagerContent as texts } from './content';
import styles from './OrderWorkTabs.module.css';

/** Три вкладки наряда — docs/CRM.md §3.3. Порядок сборов: наряд, чеклист, бумаги. */
const TABS = ['order', 'checklist', 'files'] as const;

type WorkTab = (typeof TABS)[number];

const TAB_TITLE: Record<WorkTab, string> = {
  order: texts.tabOrder,
  checklist: texts.tabChecklist,
  files: texts.tabFiles,
};

export interface OrderWorkTabsProps {
  /** Содержимое вкладок приходит готовым: разметку собирает страница. */
  readonly order: ReactNode;
  readonly checklist: ReactNode;
  readonly files: ReactNode;
}

/**
 * Работа с нарядом в трёх вкладках.
 *
 * Панели рисуются все сразу и прячутся атрибутом `hidden`, а не размонтируются:
 * переключение вкладки не должно терять наполовину заполненный отчёт о выезде
 * и выбранный файл документа.
 *
 * Клавиатура работает как положено вкладкам: стрелки переводят фокус, Home и
 * End — к краям. Без этого набор кнопок остаётся набором кнопок, чем бы его
 * ни объявили в `role`.
 */
export function OrderWorkTabs({ order, checklist, files }: OrderWorkTabsProps) {
  const [active, setActive] = useState<WorkTab>('order');
  const tabsRef = useRef<Map<WorkTab, HTMLButtonElement>>(new Map());

  const focus = (tab: WorkTab): void => {
    setActive(tab);
    tabsRef.current.get(tab)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = TABS.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(TABS[index === last ? 0 : index + 1] ?? 'order');
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(TABS[index === 0 ? last : index - 1] ?? 'order');
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focus('order');
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focus(TABS[last] ?? 'order');
    }
  };

  const panels: Record<WorkTab, ReactNode> = { order, checklist, files };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={texts.workTabsLabel}>
        {TABS.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => {
              if (node === null) tabsRef.current.delete(tab);
              else tabsRef.current.set(tab, node);
            }}
            type="button"
            role="tab"
            id={`order-tab-${tab}`}
            className={[styles.tab, active === tab ? styles.current : null]
              .filter(Boolean)
              .join(' ')}
            aria-selected={active === tab}
            aria-controls={`order-panel-${tab}`}
            /* Из ленты табов выпадают все, кроме выбранного: Tab уводит на
               панель, а между вкладками ходят стрелками. */
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {TAB_TITLE[tab]}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`order-panel-${tab}`}
          className={styles.panel}
          aria-labelledby={`order-tab-${tab}`}
          hidden={active !== tab}
          tabIndex={0}
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  );
}
