import { describe, expect, it } from 'vitest';

import { crmHref, stepQuery, todayQuery, viewQuery, type CalendarPlace } from './navigation';

const place = (over: Partial<CalendarPlace> = {}): CalendarPlace => ({
  view: 'week',
  day: '2026-08-19',
  month: '2026-08',
  today: '2026-08-29',
  team: false,
  ...over,
});

describe('адреса календаря', () => {
  it('шаг в виде месяца листает месяцами', () => {
    expect(stepQuery(place({ view: 'month' }), 1)).toEqual({ view: 'month', month: '2026-09' });
    expect(stepQuery(place({ view: 'month' }), -1)).toEqual({ view: 'month', month: '2026-07' });
  });

  it('шаг в виде недели листает неделями, в виде дня — днями', () => {
    expect(stepQuery(place(), 1)).toEqual({ view: 'week', day: '2026-08-26' });
    expect(stepQuery(place({ view: 'day' }), 1)).toEqual({ view: 'day', day: '2026-08-20' });
  });

  it('«сегодня» в виде месяца прыгает на месяц сегодняшнего дня', () => {
    expect(todayQuery(place({ view: 'month', today: '2026-11-03' }))).toEqual({
      view: 'month',
      month: '2026-11',
    });
    expect(todayQuery(place())).toEqual({ view: 'week', day: '2026-08-29' });
  });

  it('🔴 смена вида не меняет дату: человек смотрит то же самое иначе', () => {
    expect(viewQuery(place(), 'day')).toEqual({ view: 'day', day: '2026-08-19' });
    expect(viewQuery(place(), 'month')).toEqual({ view: 'month', month: '2026-08' });
  });

  it('наложение занятости переживает любой переход', () => {
    const on = place({ team: true });

    expect(stepQuery(on, 1)).toMatchObject({ team: 'on' });
    expect(todayQuery(on)).toMatchObject({ team: 'on' });
    expect(viewQuery(on, 'day')).toMatchObject({ team: 'on' });
  });

  it('адрес собирается строкой раздела с запросом', () => {
    expect(crmHref({ view: 'day', day: '2026-08-19' })).toBe('/admin/crm?view=day&day=2026-08-19');
  });
});
