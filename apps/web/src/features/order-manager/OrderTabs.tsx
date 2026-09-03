import Link from 'next/link';

import { ORDER_TAB_TITLE, orderManagerContent as texts } from './content';
import { ORDER_TABS, ordersHref, type OrderFilterState, type OrderTab } from './model';
import styles from './OrderTabs.module.css';

export interface OrderTabsProps {
  /** Выбранная стопка. Без параметра в адресе — «Активные». */
  readonly tab: OrderTab;
  /** Период и поиск переезжают вместе со стопкой: фильтр сменой вкладки не сбрасывается. */
  readonly period: OrderFilterState['period'];
  readonly query: string;
}

/**
 * Пять стопок заказов лентой (issue #345, макет «Заказы · вкладки»).
 *
 * 🔴 Вкладка живёт в адресе, а не в состоянии: «Отказы за прошлый месяц» —
 * ссылка, которую сохраняют в закладки и присылают коллеге (ADR-255). Отсюда
 * и серверный компонент без единой строки своего JS — это обычные ссылки.
 *
 * 🔴 До 600px лента переносится на вторую строку, а не прокручивается вбок.
 * Прокрутка увела бы «Все» за правый край, и открытая вкладка оказалась бы
 * невидимой: подвезти её к глазам без клиентского JS нечем, а платить
 * бюджетом панели за позицию прокрутки списка нечем тем более (ADR-266).
 */
export function OrderTabs({ tab, period, query }: OrderTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={texts.tabsLabel}>
      {ORDER_TABS.map((item) => (
        <Link
          className={[styles.tab, item === tab ? styles.current : null].filter(Boolean).join(' ')}
          key={item}
          href={ordersHref({ tab: item, period, query })}
          /* 🔴 Прокрутка не сбрасывается наверх: стопки сравнивают, стоя в
             середине списка, и прыжок к шапке на каждом переключении теряет
             место (issue #342). */
          scroll={false}
          aria-current={item === tab ? 'page' : undefined}
        >
          {ORDER_TAB_TITLE[item]}
        </Link>
      ))}
    </nav>
  );
}
