/**
 * Чипы изменения у плиток «Обзора» (issue #590).
 *
 * 🔴 Чип показывается только там, где есть с чем сравнивать. «↑ 100 %» у
 * месяца, в котором до этого не закрыли ни одного наряда, — это рост с нуля,
 * то есть число, не значащее ничего; такой чип не рисуется вовсе, а не
 * подменяется бодрой стрелкой вверх.
 *
 * Функция чистая и лежит отдельно от разметки: она решает, что владелец
 * прочтёт над своей выручкой, — а такое проверяется тестом, а не взглядом.
 */
import type { StatDelta } from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';

/** Сутки без ответа — граница, после которой обращение считается залежавшимся. */
const STALE_HOURS = 24;

export type TileInput = {
  /**
   * Сколько часов ждёт самое старое непринятое обращение. `null` — таких нет,
   * и тревожить нечем.
   */
  readonly staleLeadHours: number | null;
  /** Наряды, заведённые за последние семь суток, и за предыдущие семь. */
  readonly ordersFlow: number;
  readonly ordersFlowBefore: number;
  /** Выручка месяца и выручка прошлого на то же число дней. */
  readonly revenue: number;
  readonly revenueBefore: number;
  /** Что остаётся после выплат бригадам — не прибыль (ADR-318). */
  readonly retained: number;
};

/** Чипы четырёх плиток. `null` — сравнивать не с чем, чипа не будет. */
export type SummaryDeltas = {
  readonly leads: StatDelta | null;
  readonly orders: StatDelta | null;
  readonly revenue: StatDelta | null;
  readonly retained: StatDelta | null;
};

/** Куда изменилось число. Ноль — «без изменений», а не «спад на ноль». */
function trendOf(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

export function overviewDeltas(input: TileInput): SummaryDeltas {
  const flow = input.ordersFlow - input.ordersFlowBefore;
  const revenueGrowth =
    input.revenueBefore === 0
      ? null
      : ((input.revenue - input.revenueBefore) / input.revenueBefore) * 100;

  return {
    /* 🔴 Тревога, а не направление: у очереди обращений владельцу важна не
       динамика, а то, что самое старое висит вторые сутки. Часы до суток
       считаются часами — «0 суток» ничего не сообщает. */
    leads:
      input.staleLeadHours === null
        ? null
        : {
            trend: 'alert',
            value:
              input.staleLeadHours < STALE_HOURS
                ? texts.leadsStale(input.staleLeadHours)
                : texts.leadsStaleDay(Math.floor(input.staleLeadHours / STALE_HOURS)),
          },

    /* Поток заведённых нарядов за неделю против предыдущей. Сравнивать саму
       очередь активных не с чем: сколько их было неделю назад, база не
       помнит, а выдумать это число нельзя. */
    orders:
      input.ordersFlow === 0 && input.ordersFlowBefore === 0
        ? null
        : { trend: trendOf(flow), value: texts.flowDelta(flow) },

    revenue:
      revenueGrowth === null
        ? null
        : { trend: trendOf(revenueGrowth), value: texts.percentDelta(revenueGrowth) },

    /* Доля, а не направление: сравнивать её с прошлым месяцем значит
       показывать два процента подряд, из которых один — процент от процента. */
    retained:
      input.revenue === 0
        ? null
        : {
            trend: 'flat',
            value: texts.sharePercent(Math.round((input.retained / input.revenue) * 100)),
          },
  };
}
