import { describe, expect, it } from 'vitest';

import {
  DEFAULT_UPCOMING_FILTERS,
  toggledColumns,
  upcomingFiltersFromParams,
  upcomingQuery,
  upcomingReset,
  visibleUpcomingColumns,
} from './summary-list';

describe('Отбор «Ближайших дел»', () => {
  it('пустой адрес даёт умолчание', () => {
    expect(upcomingFiltersFromParams({})).toEqual(DEFAULT_UPCOMING_FILTERS);
  });

  /* 🔴 Адрес правят руками и присылают друг другу: мусор в параметре обязан
     открывать умолчание, а не ронять раздел (issue #341). */
  it('мусор в параметрах открывает умолчание, а не ломает список', () => {
    const filters = upcomingFiltersFromParams({
      show: 'всё',
      sort: 'по-русски',
      cols: 'фамилия,',
      page: 'вторая',
    });

    expect(filters.show).toBe('all');
    expect(filters.sort).toBe('time');
    expect(filters.hidden).toEqual([]);
    expect(filters.page).toBe(1);
  });

  it('читает выбранное условие, порядок, поиск и страницу', () => {
    const filters = upcomingFiltersFromParams({
      show: 'overdue',
      sort: 'sum',
      cols: 'installer,sum',
      q: '  Оборонная  ',
      page: '3',
    });

    expect(filters).toEqual({
      show: 'overdue',
      sort: 'sum',
      query: 'Оборонная',
      hidden: ['installer', 'sum'],
      page: 3,
    });
  });

  /* 🔴 «Когда» и «Работа» опознают строку: список ближайших дел без времени
     перестаёт быть планом, а без работы — списком неизвестно чего. */
  it('запертую колонку не выключить даже адресом', () => {
    const filters = upcomingFiltersFromParams({ cols: 'when,work,sum' });

    expect(filters.hidden).toEqual(['sum']);
    expect(visibleUpcomingColumns(filters.hidden)).toEqual(['when', 'work', 'installer', 'status']);
  });

  it('одна и та же колонка в адресе дважды не удваивается', () => {
    expect(upcomingFiltersFromParams({ cols: 'sum,sum' }).hidden).toEqual(['sum']);
  });

  /* Умолчания в адрес не уезжают: `?show=all&sort=time` — параметры, которые
     ничего не выбирают, а ссылка с ними читается как применённый отбор. */
  it('умолчания не попадают в адрес', () => {
    expect(upcomingQuery(DEFAULT_UPCOMING_FILTERS)).toEqual({});
  });

  it('выбранные условия попадают в адрес, страница — только со второй', () => {
    expect(
      upcomingQuery({
        show: 'orders',
        sort: 'sum',
        query: 'Тула',
        hidden: ['sum', 'installer'],
        page: 2,
      }),
    ).toEqual({ show: 'orders', sort: 'sum', q: 'Тула', cols: 'installer,sum', page: '2' });
  });

  /* 🔴 Смена условия сбрасывает страницу: у отобранного списка третьей
     страницы обычно нет, и владелец получил бы пустой экран. */
  it('любая смена условия возвращает на первую страницу', () => {
    const href = upcomingReset({ ...DEFAULT_UPCOMING_FILTERS, page: 4 }, { show: 'overdue' });

    expect(href.query).toEqual({ show: 'overdue' });
  });

  it('переключение колонки работает в обе стороны', () => {
    expect(toggledColumns([], 'sum')).toEqual(['sum']);
    expect(toggledColumns(['sum'], 'sum')).toEqual([]);
  });
});
