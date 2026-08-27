import { describe, expect, it } from 'vitest';

import {
  formatDegrees,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDateIso,
  formatMoney,
  formatNumber,
  formatPhone,
  formatQuantity,
  formatSuffix,
  phoneHref,
} from './format';

const NBSP = '\u00A0';

describe('formatMoney', () => {
  it('разделяет разряды неразрывным пробелом и ставит рубль', () => {
    expect(formatMoney(38_500)).toBe(`38${NBSP}500${NBSP}₽`);
    expect(formatMoney(6000)).toBe(`6${NBSP}000${NBSP}₽`);
    expect(formatMoney(1_234_567)).toBe(`1${NBSP}234${NBSP}567${NBSP}₽`);
  });

  it('в результате нет обычных пробелов — цена не переносится по строке', () => {
    expect(formatMoney(38_500)).not.toContain(' ');
  });

  it('ноль и дробное значение выводятся без копеек', () => {
    expect(formatMoney(0)).toBe(`0${NBSP}₽`);
    expect(formatNumber(15_900.4)).toBe(`15${NBSP}900`);
  });
});

describe('formatSuffix', () => {
  it('🔴 слово отделяется от числа: настройки обрезают пробел, ставит его код', () => {
    expect(formatSuffix('года')).toBe(`${NBSP}года`);
    expect(formatSuffix(' года')).toBe(`${NBSP}года`);
    expect(formatSuffix('день')).toBe(`${NBSP}день`);
  });

  it('знак остаётся вплотную к числу', () => {
    expect(formatSuffix('+')).toBe('+');
    expect(formatSuffix('%')).toBe('%');
    expect(formatSuffix('°')).toBe('°');
  });

  it('пробел неразрывный: «3 года» — одна величина и по строкам не рвётся', () => {
    expect(formatSuffix('года')).not.toContain(' ');
  });

  it('пустой хвост ничего не добавляет', () => {
    expect(formatSuffix('')).toBe('');
    expect(formatSuffix('   ')).toBe('');
    expect(formatSuffix(undefined)).toBe('');
  });
});

describe('formatDegrees', () => {
  it('ставит знак плюса у положительной температуры', () => {
    expect(formatDegrees(27)).toBe('+27°');
  });

  it('🔴 отрицательная температура получает типографский минус, а не дефис', () => {
    expect(formatDegrees(-7)).toBe('−7°');
    expect(formatDegrees(-7)).not.toContain('-');
  });

  it('у нуля знака нет', () => {
    expect(formatDegrees(0)).toBe('0°');
  });

  it('доли градуса округляются', () => {
    expect(formatDegrees(26.6)).toBe('+27°');
    expect(formatDegrees(-2.4)).toBe('−2°');
  });
});

describe('formatPhone', () => {
  it('приводит номер к единому виду', () => {
    expect(formatPhone('+74872123456')).toBe(`+7${NBSP}(4872)${NBSP}12-34-56`);
    expect(formatPhone('89001234567')).toBe(`+7${NBSP}(900)${NBSP}123-45-67`);
    expect(formatPhone('9001234567')).toBe(`+7${NBSP}(900)${NBSP}123-45-67`);
    expect(formatPhone('+7 (900) 123-45-67')).toBe(`+7${NBSP}(900)${NBSP}123-45-67`);
  });

  it('длину кода можно задать явно — план нумерации её не фиксирует', () => {
    expect(formatPhone('+74951234567', 3)).toBe(`+7${NBSP}(495)${NBSP}123-45-67`);
  });

  it('нераспознанный номер возвращается дословно', () => {
    expect(formatPhone('102')).toBe('102');
    expect(formatPhone('  ')).toBe('');
  });
});

describe('phoneHref', () => {
  it('оставляет только плюс и цифры', () => {
    expect(phoneHref('+7 (4872) 12-34-56')).toBe('tel:+74872123456');
    expect(phoneHref('8 900 123-45-67')).toBe('tel:+79001234567');
  });
});

describe('formatDate', () => {
  it('выводит дату по-русски без «г.»', () => {
    expect(formatDate('2026-05-12')).toBe('12 мая 2026');
    expect(formatDate(new Date('2026-01-01T00:00:00Z'))).toBe('1 января 2026');
  });

  it('не зависит от часового пояса читателя', () => {
    expect(formatDate('2026-05-12T00:00:00Z')).toBe('12 мая 2026');
    expect(formatDate('2026-05-12T23:59:59Z')).toBe('12 мая 2026');
  });

  it('некорректная дата не роняет страницу', () => {
    expect(formatDate('не дата')).toBe('');
    expect(formatDateIso('не дата')).toBe('');
  });
});

describe('formatDateIso', () => {
  it('даёт значение для datetime и JSON-LD', () => {
    expect(formatDateIso('2026-05-12T21:00:00Z')).toBe('2026-05-12');
    expect(formatDateIso(new Date('2026-12-31T00:00:00Z'))).toBe('2026-12-31');
  });
});

describe('formatDateShort и formatDateTime', () => {
  it('дают колонку админки и момент события', () => {
    expect(formatDateShort('2026-05-12T09:30:00Z')).toBe('12.05.2026');
    expect(formatDateTime('2026-05-12T09:30:00Z')).toBe('12.05.2026, 12:30');
  });

  it('считают по Туле, а не по поясу того, кто смотрит', () => {
    // 21:30 UTC — это уже следующий день по Москве, и владелец увидит именно его
    expect(formatDateShort('2026-05-12T21:30:00Z')).toBe('13.05.2026');
    expect(formatDateTime('2026-05-12T21:30:00Z')).toBe('13.05.2026, 00:30');
  });

  it('часовой пояс можно задать явно', () => {
    expect(formatDateShort('2026-05-12T21:30:00Z', 'UTC')).toBe('12.05.2026');
    expect(formatDateTime('2026-05-12T21:30:00Z', 'UTC')).toBe('12.05.2026, 21:30');
  });

  it('некорректная дата не роняет страницу', () => {
    expect(formatDateShort('не дата')).toBe('');
    expect(formatDateTime('не дата')).toBe('');
  });
});

describe('formatQuantity', () => {
  it('дробное количество склада — с запятой и разрядами', () => {
    expect(formatQuantity(43.5)).toBe('43,5');
    expect(formatQuantity(12_000)).toBe(`12${NBSP}000`);
    expect(formatQuantity(0.35)).toBe('0,35');
  });

  it('🔴 минус типографский: дефис читается как перенос и рвёт число', () => {
    expect(formatQuantity(-1.5)).toBe('−1,5');
    expect(formatQuantity(-2)).toBe('−2');
  });

  it('больше трёх знаков склад не хранит и не показывает', () => {
    expect(formatQuantity(1.23456)).toBe('1,235');
  });
});
