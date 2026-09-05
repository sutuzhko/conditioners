import { describe, expect, it } from 'vitest';

import { orderCancelIssue } from '@/entities/order/model';

import {
  columnLocked,
  columnShown,
  columnsOf,
  isOrderColumn,
  rowActionOf,
  selectableTab,
  visibleColumns,
} from './columns';
import { DEFAULT_ORDER_FILTERS, orderColumnsFromParam, ordersQuery } from './model';

describe('колонки вкладки', () => {
  it('🔴 пять вкладок дают пять разных наборов колонок', () => {
    const sets = (['active', 'new', 'history', 'cancelled', 'all'] as const).map((tab) =>
      visibleColumns(tab).join(','),
    );

    expect(new Set(sets).size).toBe(5);
  });

  it('🔴 «Отказы» показывают дату отказа и причину, а не статус', () => {
    const set = visibleColumns('cancelled');

    expect(set).toContain('declined');
    expect(set).toContain('reason');
    /* Статус на этой стопке одинаков у всех строк: колонка из пяти
       одинаковых плашек не сообщает ничего. */
    expect(set).not.toContain('status');
  });

  it('«Новые» показывают, откуда взялся заказ и когда его завели', () => {
    const set = visibleColumns('new');

    expect(set).toContain('source');
    expect(set).toContain('created');
    expect(set).not.toContain('installer');
  });

  it('«История» показывает день закрытия вместо дня выезда', () => {
    const set = visibleColumns('history');

    expect(set).toContain('closed');
    expect(set).not.toContain('when');
  });

  it('🔴 номер и клиент есть на каждой вкладке и не выключаются', () => {
    for (const tab of ['active', 'new', 'history', 'cancelled', 'all'] as const) {
      /* Даже если попросить их спрятать — строку опознают по ним, и список,
         в котором нечем понять, чей это заказ, не список. */
      const set = visibleColumns(tab, ['number', 'client']);

      expect(set).toContain('number');
      expect(set).toContain('client');
    }

    expect(columnLocked('number')).toBe(true);
    expect(columnLocked('sum')).toBe(false);
  });

  it('переключение переворачивает колонку относительно умолчания вкладки', () => {
    /* «Тип» на «Активных» спрятан по умолчанию — переключение его включает. */
    expect(columnShown('active', [], 'type')).toBe(false);
    expect(columnShown('active', ['type'], 'type')).toBe(true);

    /* «Сумма» показана — то же переключение её выключает. */
    expect(columnShown('active', [], 'sum')).toBe(true);
    expect(columnShown('active', ['sum'], 'sum')).toBe(false);
  });

  it('переключается только то, что вкладка вообще умеет показывать', () => {
    /* «Причина» на «Активных» не появится: у наряда в работе её нет. */
    expect(columnsOf('active')).not.toContain('reason');
    expect(visibleColumns('active', ['reason'])).not.toContain('reason');
  });

  it('порядок колонок не зависит от порядка переключений', () => {
    expect(visibleColumns('all', ['status', 'type'])).toEqual(
      visibleColumns('all', ['type', 'status']),
    );
  });

  it('🔴 действие строки своё у стопки: назначить у новых, вернуть у отказов', () => {
    expect(rowActionOf('new')).toBe('assign');
    expect(rowActionOf('cancelled')).toBe('restore');
    expect(rowActionOf('active')).toBeNull();
    expect(rowActionOf('history')).toBeNull();
  });

  it('🔴 галочки есть только там, где групповому действию есть что делать', () => {
    expect(selectableTab('active')).toBe(true);
    expect(selectableTab('new')).toBe(true);
    /* Назначать исполнителя выполненной работе или отказу нечего, и галочки
       без действия — это колонка, которая ничего не делает. */
    expect(selectableTab('history')).toBe(false);
    expect(selectableTab('cancelled')).toBe(false);
  });
});

describe('состав колонок в адресе', () => {
  it('мусор в параметре игнорируется, а не роняет раздел', () => {
    expect(orderColumnsFromParam('type,,чушь,sum')).toEqual(['type', 'sum']);
    expect(orderColumnsFromParam(undefined)).toEqual([]);
    expect(isOrderColumn('чушь')).toBe(false);
  });

  it('умолчание в адрес не уезжает', () => {
    expect(ordersQuery(DEFAULT_ORDER_FILTERS)).toEqual({});
    expect(ordersQuery({ columns: ['type'] })).toEqual({ cols: 'type' });
  });

  it('сортировка и число строк тоже живут в адресе', () => {
    expect(ordersQuery({ sort: 'sum', size: 16 })).toEqual({ sort: 'sum', size: '16' });
  });
});

describe('🔴 отказ без причины (ADR-310)', () => {
  it('перевод в отказ без причины называет проблему словами', () => {
    expect(orderCancelIssue('cancelled', false)).toMatch(/причин/i);
  });

  it('с причиной отказ проходит', () => {
    expect(orderCancelIssue('cancelled', true)).toBeNull();
  });

  it('к остальным статусам правило не применяется', () => {
    expect(orderCancelIssue('new', false)).toBeNull();
    expect(orderCancelIssue('done', false)).toBeNull();
  });
});
