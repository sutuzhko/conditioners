import Link from 'next/link';

import { Badge } from '@/shared/ui';

import { ORDER_TAB_TITLE, orderManagerContent as texts } from './content';
import { ORDER_TABS, ordersHref, type OrderFilterState, type OrderTab } from './model';
import styles from './OrderTabs.module.css';

/** Сколько нарядов в стопке. Пусто — у вкладки счётчика нет вовсе. */
export type OrderTabCounts = Partial<Readonly<Record<OrderTab, number>>>;

export interface OrderTabsProps {
  /** Выбранная стопка. Без параметра в адресе — «Активные». */
  readonly tab: OrderTab;
  /** Период и поиск переезжают вместе со стопкой: фильтр сменой вкладки не сбрасывается. */
  readonly period: OrderFilterState['period'];
  readonly query: string;
  /**
   * Числа в подписях вкладок (issue #593).
   *
   * 🔴 Не у всех пяти: счётчик отвечает на вопрос «сколько там ждёт» и на
   * закрытых стопках означал бы «сколько накопилось за всё время» — число,
   * которое растёт само и ни к чему не зовёт. Макет ставит его у «Активных»,
   * «Новых» и «Всех», и это ровно те три, где оно что-то значит.
   */
  readonly counts?: OrderTabCounts | undefined;
}

/**
 * Пять стопок заказов лентой (issue #345, #593, макет «Заказы · вкладки»).
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
export function OrderTabs({ tab, period, query, counts = {} }: OrderTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={texts.tabsLabel}>
      {ORDER_TABS.map((item) => {
        const count = counts[item];

        return (
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

            {count === undefined ? null : (
              /* Число на экране, словами — для озвучки: «Активные 7» читалка
                 объявляет как «Активные семь», и это не значит ничего. */
              <Badge className={styles.count} size="sm" variant="neutral">
                <span aria-hidden="true">{count}</span>
                <span className="srOnly">{texts.tabCount(ORDER_TAB_TITLE[item], count)}</span>
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
