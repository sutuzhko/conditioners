import { describe, expect, it } from 'vitest';

import { formatQty } from './content';
import { bracket, freon, items, noThresholdOverview, pipe, zones } from './fixtures';
import {
  DEFAULT_STOCK_JOURNAL_FILTERS,
  DEFAULT_STOCK_PAGE_SIZE,
  checkMove,
  checkZone,
  emptyMoveDraft,
  hasShortage,
  itemDraftOf,
  moveBody,
  moveDraftOf,
  moveKindFromParam,
  pageSizeFromParam,
  periodFromParam,
  qtyInput,
  stockFiltersApplied,
  stockJournalApplied,
  stockJournalQuery,
  stockMovePath,
  stockMoveQuery,
  stockQuery,
  zoneQty,
} from './model';

describe('фильтр остатков живёт в адресе', () => {
  it('умолчания в адрес не уезжают', () => {
    expect(stockQuery({})).toEqual({});
    expect(stockQuery({ query: '  ', group: '', low: false, archived: false })).toEqual({});
  });

  it('заданный фильтр переносится целиком', () => {
    expect(stockQuery({ query: ' труба ', group: 'Крепёж', low: true, archived: false })).toEqual({
      q: 'труба',
      group: 'Крепёж',
      low: '1',
    });
  });

  it('пустой результат объясняется по-разному в зависимости от фильтра', () => {
    expect(stockFiltersApplied({})).toBe(false);
    expect(stockFiltersApplied({ low: true, archived: false })).toBe(true);
  });
});

describe('остаток по зонам', () => {
  it('зона без ключа — это ноль, а не пропуск', () => {
    expect(zoneQty(pipe, 'z1')).toBe(43.5);
    expect(zoneQty(pipe, 'нет такой зоны')).toBe(0);
  });

  it('🔴 минус ищется по зонам, а не только по итогу: итог может его скрыть', () => {
    expect(freon.total).toBeGreaterThan(0);
    expect(hasShortage(freon, zones)).toBe(true);
    expect(hasShortage(pipe, zones)).toBe(false);
  });

  it('дробный остаток пишется по-русски, минус — типографский', () => {
    expect(formatQty(43.5)).toBe('43,5');
    expect(formatQty(-1.5)).toBe('−1,5');
    expect(formatQty(12000)).toBe('12 000');
  });
});

describe('позиция справочника', () => {
  it('порог, которого нет, приходит пустым полем, а не нулём', () => {
    expect(itemDraftOf(bracket).minQty).toBe('6');
    expect(itemDraftOf({ ...bracket, minQty: 0 }).minQty).toBe('');

    /* 🔴 Ключа `minQty` может не быть вовсе — это владельческий ключ, и
       «порога нет» отличается от «порог равен нулю» только его отсутствием. */
    const withoutThreshold = noThresholdOverview.items[0];
    expect(withoutThreshold).toBeDefined();
    expect(itemDraftOf(withoutThreshold ?? bracket).minQty).toBe('');
  });

  it('дробное число показывается через запятую: так его и вводят', () => {
    expect(qtyInput(4.5)).toBe('4,5');
    expect(qtyInput(30)).toBe('30');
  });

  it('ссылка на модель каталога переносится в форму', () => {
    const technique = items.find((item) => item.product !== null);
    expect(itemDraftOf(technique ?? pipe).productId).toBe('p1');
    expect(itemDraftOf(pipe).productId).toBe('');
  });
});

describe('тело движения зависит от вида', () => {
  it('🔴 у прихода нет зоны-источника, а у перемещения она обязательна', () => {
    const income = moveBody({ ...emptyMoveDraft('s1'), qty: '5', toZoneId: 'z1' });
    expect(income).not.toHaveProperty('fromZoneId');

    const transfer = moveBody({
      ...emptyMoveDraft('s1'),
      kind: 'transfer',
      qty: '5',
      fromZoneId: 'z1',
      toZoneId: 'z2',
    });
    expect(transfer).toMatchObject({ fromZoneId: 'z1', toZoneId: 'z2' });
    expect(transfer).not.toHaveProperty('serials');
  });

  it('🔴 инвентаризация без основания не проводится', () => {
    const draft = { ...emptyMoveDraft('s1'), kind: 'count' as const, qty: '-2', toZoneId: 'z1' };

    expect(checkMove(draft)?.field).toBe('reason');
    expect(checkMove({ ...draft, reason: 'Пересчёт' })).toBeNull();
  });

  it('количество принимается по-русски: «12 000» и «1,5»', () => {
    const draft = { ...emptyMoveDraft('s1'), toZoneId: 'z1' };

    expect(checkMove({ ...draft, qty: '12 000' })).toBeNull();
    expect(checkMove({ ...draft, qty: '1,5' })).toBeNull();
    expect(checkMove({ ...draft, qty: 'сколько-то' })?.field).toBe('qty');
  });
});

describe('🔴 зона: машина принадлежит человеку, гараж — никому', () => {
  const draft = { kind: 'van' as const, name: 'Газель', userId: '', sort: '1', archived: false };

  it('машина без хозяина не проходит', () => {
    expect(checkZone(draft, false)?.field).toBe('userId');
    expect(checkZone({ ...draft, userId: 'u2' }, false)).toBeNull();
  });

  it('склад с хозяином не проходит', () => {
    expect(checkZone({ ...draft, kind: 'warehouse', userId: 'u2' }, false)?.field).toBe('userId');
    expect(checkZone({ ...draft, kind: 'warehouse', userId: '' }, false)).toBeNull();
  });
});

describe('🔴 окно перемещения открывается адресом, а не состоянием', () => {
  it('пустое в адрес не уезжает: `?from=` ничего не выбирает', () => {
    expect(stockMoveQuery({})).toEqual({});
    expect(stockMovePath({})).toBe('/admin/stock/move');
  });

  it('отпущенная ячейка приносит позицию и обе зоны', () => {
    expect(stockMovePath({ item: 's1', from: 'z1', to: 'z2' })).toBe(
      '/admin/stock/move?item=s1&from=z1&to=z2',
    );
  });

  it('с зоной-источником это перемещение, без неё — приход', () => {
    expect(moveDraftOf({ item: 's1', from: 'z1', to: 'z2' })).toEqual({
      kind: 'transfer',
      itemId: 's1',
      qty: '',
      fromZoneId: 'z1',
      toZoneId: 'z2',
      serials: '',
      reason: '',
    });

    expect(moveDraftOf({ item: 's1' }).kind).toBe('income');
  });

  it('вид из адреса сильнее догадки', () => {
    expect(moveDraftOf({ item: 's1', kind: 'count' }).kind).toBe('count');
  });

  it('🔴 списание и возврат адресом не заводятся: они живут в карточке наряда', () => {
    /* Движение без наряда сервер не примет, и предлагать его форме нечего. */
    expect(moveDraftOf({ item: 's1', kind: 'consume' }).kind).toBe('income');
    expect(moveDraftOf({ item: 's1', from: 'z1', kind: 'return' }).kind).toBe('transfer');
  });

  it('мусор в адресе не ломает форму: разбирается как обычный приход', () => {
    expect(moveDraftOf({ item: 's1', kind: 'что-нибудь' }).kind).toBe('income');
    expect(moveDraftOf({}).itemId).toBe('');
  });

  it('зона-источник не переезжает в чужой вид: приход её не ждёт', () => {
    expect(moveDraftOf({ item: 's1', from: 'z1', to: 'z2', kind: 'income' }).fromZoneId).toBe('');
  });
});

/**
 * 🔴 Сколько строк на странице — выбор владельца, а не константа репозитория
 * (issue #608). Живёт в адресе: ссылку на «пятьдесят строк» можно прислать.
 */
describe('шаг листания остатков', () => {
  it('умолчание в адрес не уезжает', () => {
    expect(stockQuery({ size: DEFAULT_STOCK_PAGE_SIZE })).toEqual({});
  });

  it('выбранная ступень уезжает', () => {
    expect(stockQuery({ size: 8 })).toEqual({ size: '8' });
  });

  it('мусор и чужое число дают умолчание, а не отказ: адрес правят руками', () => {
    expect(pageSizeFromParam('8')).toBe(8);
    expect(pageSizeFromParam('7')).toBe(DEFAULT_STOCK_PAGE_SIZE);
    expect(pageSizeFromParam('много')).toBe(DEFAULT_STOCK_PAGE_SIZE);
    expect(pageSizeFromParam(undefined)).toBe(DEFAULT_STOCK_PAGE_SIZE);
  });
});

describe('отбор журнала живёт в адресе', () => {
  it('умолчания в адрес не уезжают', () => {
    expect(stockJournalQuery(DEFAULT_STOCK_JOURNAL_FILTERS)).toEqual({});
    expect(stockJournalApplied(DEFAULT_STOCK_JOURNAL_FILTERS)).toBe(false);
  });

  it('вид, период и поиск уезжают вместе', () => {
    expect(stockJournalQuery({ kind: 'income', period: 'prev', query: ' труба ' })).toEqual({
      kind: 'income',
      period: 'prev',
      q: 'труба',
    });
    expect(stockJournalApplied({ query: 'труба' })).toBe(true);
  });

  it('мусор в адресе — «покажи всё», а не пустой журнал с необъяснимым фильтром', () => {
    expect(moveKindFromParam('income')).toBe('income');
    expect(moveKindFromParam('чепуха')).toBeUndefined();
    expect(periodFromParam('month')).toBe('month');
    expect(periodFromParam('чепуха')).toBe('all');
  });
});
