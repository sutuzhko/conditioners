// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/* База сюда не нужна: проверяются чистые функции, по которым считаются
   столбцы, линии и сравнение выручки. Мок стоит ради импорта модуля —
   `server/db` поднимает клиента Prisma при загрузке. */
vi.mock('@/server/db', () => ({ db: { order: {}, crmEvent: {} } }));

import {
  chartsOf,
  comparatorOf,
  isoWeekNumber,
  monthLabel,
  revenueBeforeOf,
  type UpcomingRow,
} from '@/server/repo/summary';

/** Наряд, закрытый в этот момент по Москве, на эту сумму. */
function done(at: string, price: number, fee = 0, deduction = 0) {
  return { at: new Date(at), price, installerFee: fee, deductionSum: deduction };
}

/** Строка ленты — только те поля, по которым идёт сортировка. */
function row(at: string, price: number | null): UpcomingRow {
  return {
    id: at,
    nature: price === null ? 'event' : 'order',
    at,
    durationMin: 60,
    number: null,
    orderType: null,
    eventKind: null,
    status: null,
    clientName: 'Клиент',
    clientPhone: null,
    address: null,
    installer: null,
    price,
  };
}

describe('Номер недели', () => {
  it('считается по ISO: неделя достаётся году своего четверга', () => {
    /* 1 января 2026 — четверг, то есть первая неделя года. */
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    /* 31 декабря 2025 — среда 1-й недели 2026 года. */
    expect(isoWeekNumber('2025-12-31')).toBe(1);
    /* 29 декабря 2025 — понедельник той же недели. */
    expect(isoWeekNumber('2025-12-29')).toBe(1);
  });

  it('соседние понедельники дают соседние номера', () => {
    expect(isoWeekNumber('2026-08-24')).toBe(35);
    expect(isoWeekNumber('2026-08-31')).toBe(36);
  });
});

describe('Подпись месяца', () => {
  /* Точку `Intl` ставит, макет — нет. */
  it('короткая и без точки', () => {
    expect(monthLabel('2026-01')).toBe('янв');
    expect(monthLabel('2026-08')).toBe('авг');
  });
});

describe('Раскладка по делениям графиков', () => {
  const weeks = ['2026-08-17', '2026-08-24', '2026-08-31'];
  const months = ['2026-06', '2026-07', '2026-08'];

  it('пустая база даёт нули по всем делениям, а не пустой график', () => {
    const charts = chartsOf([], weeks, months);

    expect(charts.weeks.map((point) => point.value)).toEqual([0, 0, 0]);
    expect(charts.revenue).toHaveLength(3);
    expect(charts.payout.map((point) => point.value)).toEqual([0, 0, 0]);
  });

  it('столбец недели считает наряды, а не их сумму', () => {
    const charts = chartsOf(
      [done('2026-08-25T09:00:00.000Z', 30_000), done('2026-08-27T09:00:00.000Z', 5_000)],
      weeks,
      months,
    );

    expect(charts.weeks[1]?.value).toBe(2);
  });

  /* 🔴 День берётся в поясе работ: наряд, закрытый в час ночи понедельника по
     Москве, принадлежит этой неделе, а не прошлой (ADR-080). */
  it('наряд первого часа понедельника по Москве достаётся своей неделе', () => {
    const charts = chartsOf([done('2026-08-23T22:30:00.000Z', 10_000)], weeks, months);

    expect(charts.weeks.map((point) => point.value)).toEqual([0, 1, 0]);
  });

  it('линии считают выручку и выплату за вычетом удержания', () => {
    const charts = chartsOf(
      [done('2026-07-10T09:00:00.000Z', 40_000, 12_000, 2_000)],
      weeks,
      months,
    );

    expect(charts.revenue[1]?.value).toBe(40_000);
    expect(charts.payout[1]?.value).toBe(10_000);
  });

  /* Отрицательная «выплата» на графике читалась бы как долг монтажника. */
  it('удержание больше вознаграждения не уводит выплату в минус', () => {
    const charts = chartsOf(
      [done('2026-07-10T09:00:00.000Z', 40_000, 5_000, 9_000)],
      weeks,
      months,
    );

    expect(charts.payout[1]?.value).toBe(0);
  });
});

describe('Выручка прошлого месяца для сравнения', () => {
  /* 🔴 На то же число дней, а не месяц целиком: полный июль против пяти дней
     августа показывает обвал каждое первое число. */
  it('обрезается тем же числом, что прошло в текущем месяце', () => {
    const rows = [
      done('2026-07-03T09:00:00.000Z', 100_000),
      done('2026-07-20T09:00:00.000Z', 300_000),
      done('2026-08-02T09:00:00.000Z', 50_000),
    ];

    expect(revenueBeforeOf(rows, '2026-08-05')).toBe(100_000);
  });

  it('к концу месяца сравнивается уже весь прошлый', () => {
    const rows = [
      done('2026-07-03T09:00:00.000Z', 100_000),
      done('2026-07-20T09:00:00.000Z', 300_000),
    ];

    expect(revenueBeforeOf(rows, '2026-08-31')).toBe(400_000);
  });
});

describe('Порядок ленты ближайших дел', () => {
  it('по времени — ближайшее первым', () => {
    const rows = [row('2026-08-30T09:00:00.000Z', 100), row('2026-08-29T09:00:00.000Z', 200)];

    expect([...rows].sort(comparatorOf('time')).map((item) => item.at)).toEqual([
      '2026-08-29T09:00:00.000Z',
      '2026-08-30T09:00:00.000Z',
    ]);
  });

  /* 🔴 Без суммы строка не «нулевая», а «неприменимая»: дело в сортировке по
     деньгам уходит в конец, а не встаёт рядом с нарядом за ноль рублей. */
  it('по сумме дела уходят в хвост, а не притворяются нулём', () => {
    const rows = [
      row('2026-08-29T09:00:00.000Z', null),
      row('2026-08-30T09:00:00.000Z', 0),
      row('2026-08-31T09:00:00.000Z', 500),
    ];

    expect([...rows].sort(comparatorOf('sum')).map((item) => item.price)).toEqual([500, 0, null]);
  });

  it('равные суммы упорядочены временем, а не случайно', () => {
    const rows = [row('2026-08-31T09:00:00.000Z', 500), row('2026-08-29T09:00:00.000Z', 500)];

    expect([...rows].sort(comparatorOf('sum')).map((item) => item.at)).toEqual([
      '2026-08-29T09:00:00.000Z',
      '2026-08-31T09:00:00.000Z',
    ]);
  });
});
