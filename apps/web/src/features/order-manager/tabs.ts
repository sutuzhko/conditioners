import type { TabLinkItem } from '@/shared/ui';

import { ORDER_TAB_TITLE, orderManagerContent as texts } from './content';
import { ORDER_TABS, ordersHref, type OrderFilterState, type OrderTab } from './model';

/** Сколько нарядов в стопке. Пусто — у вкладки счётчика нет вовсе. */
export type OrderTabCounts = Partial<Readonly<Record<OrderTab, number>>>;

/**
 * Пять стопок заказов для ленты кита (issue #584, #593, макет `OrdersTabs`).
 *
 * 🔴 Период и поиск переезжают вместе со стопкой: фильтр сменой вкладки не
 * сбрасывается. Адрес собирает раздел — он один знает свои условия отбора.
 *
 * 🔴 Счётчик не у всех пяти. Он отвечает на вопрос «сколько там ждёт», и на
 * закрытых стопках означал бы «сколько накопилось за всё время» — число,
 * которое растёт само и ни к чему не зовёт. Макет ставит его у «Активных»,
 * «Новых» и «Всех», и это ровно те три, где оно что-то значит.
 */
export function orderTabItems(
  filters: Pick<OrderFilterState, 'period' | 'query'>,
  counts: OrderTabCounts,
): readonly TabLinkItem<OrderTab>[] {
  return ORDER_TABS.map((tab) => {
    const title = ORDER_TAB_TITLE[tab];
    const href = ordersHref({ tab, period: filters.period, query: filters.query });
    const count = counts[tab];

    if (count === undefined) return { key: tab, title, href };

    return { key: tab, title, href, count, countLabel: texts.tabCount(count) };
  });
}
