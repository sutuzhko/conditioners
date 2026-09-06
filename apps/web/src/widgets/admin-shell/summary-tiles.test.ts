import { describe, expect, it } from 'vitest';

import { adminSummaryContent as texts } from './summary-content';
import { overviewDeltas, type TileInput } from './summary-tiles';

const quiet: TileInput = {
  staleLeadHours: null,
  ordersFlow: 0,
  ordersFlowBefore: 0,
  revenue: 0,
  revenueBefore: 0,
  retained: 0,
};

describe('Чипы изменения у плиток «Обзора»', () => {
  /* 🔴 Чип показывается только там, где есть с чем сравнивать: «↑ 100 %» у
     месяца, до которого не закрыли ни одного наряда, — число ни о чём. */
  it('на пустом сайте не рисуется ни одного чипа', () => {
    expect(overviewDeltas(quiet)).toEqual({
      leads: null,
      orders: null,
      revenue: null,
      retained: null,
    });
  });

  it('выручка без прошлого месяца остаётся без чипа', () => {
    const deltas = overviewDeltas({ ...quiet, revenue: 120_000, revenueBefore: 0 });

    expect(deltas.revenue).toBeNull();
  });

  /* 🔴 Тревога, а не направление: «↓ 1 сутки» читается ровно наоборот тому,
     что означает. */
  it('залежавшееся обращение помечается тревогой', () => {
    const deltas = overviewDeltas({ ...quiet, staleLeadHours: 29 });

    expect(deltas.leads).toEqual({ trend: 'alert', value: texts.leadsStaleDay(1) });
  });

  it('до суток возраст очереди считается часами', () => {
    const deltas = overviewDeltas({ ...quiet, staleLeadHours: 7 });

    expect(deltas.leads).toEqual({ trend: 'alert', value: texts.leadsStale(7) });
  });

  it('поток нарядов сравнивается с предыдущей неделей', () => {
    expect(overviewDeltas({ ...quiet, ordersFlow: 9, ordersFlowBefore: 7 }).orders).toEqual({
      trend: 'up',
      value: texts.flowDelta(2),
    });

    expect(overviewDeltas({ ...quiet, ordersFlow: 4, ordersFlowBefore: 7 }).orders).toEqual({
      trend: 'down',
      value: texts.flowDelta(3),
    });
  });

  it('ровно тот же поток — это «без изменений», а не спад на ноль', () => {
    expect(overviewDeltas({ ...quiet, ordersFlow: 7, ordersFlowBefore: 7 }).orders).toEqual({
      trend: 'flat',
      value: texts.flowDelta(0),
    });
  });

  it('рост выручки считается в процентах от прошлого месяца', () => {
    const deltas = overviewDeltas({ ...quiet, revenue: 109_200, revenueBefore: 100_000 });

    expect(deltas.revenue).toEqual({ trend: 'up', value: texts.percentDelta(9.2) });
  });

  it('падение выручки помечено спадом, а знак несёт глиф, а не значение', () => {
    const deltas = overviewDeltas({ ...quiet, revenue: 90_000, revenueBefore: 100_000 });

    expect(deltas.revenue?.trend).toBe('down');
    expect(deltas.revenue?.value).not.toContain('-');
  });

  /* Доля, а не направление: сравнивать её с прошлым месяцем значит показывать
     процент от процента. */
  it('остаток после выплат показан долей выручки', () => {
    const deltas = overviewDeltas({ ...quiet, revenue: 100_000, retained: 77_000 });

    expect(deltas.retained).toEqual({ trend: 'flat', value: texts.sharePercent(77) });
  });
});
