import { describe, expect, it } from 'vitest';

import {
  dayKeyOf,
  dayRange,
  gridRange,
  momentOf,
  monthGrid,
  minutesOfDay,
  monthKeyOf,
  parseDayKey,
  parseMonthKey,
  shiftDay,
  shiftMonth,
  shiftWeek,
  timeOf,
  weekGrid,
  weekRange,
  weekStartOf,
  weekdayOf,
} from './calendar';

describe('ключи дня и месяца', () => {
  it('берёт дату в московском времени, а не в UTC', () => {
    // 22:30 UTC — в Туле уже следующий день
    const at = new Date('2026-08-23T22:30:00.000Z');

    expect(dayKeyOf(at)).toBe('2026-08-24');
    expect(timeOf(at)).toBe('01:30');
    expect(monthKeyOf(at)).toBe('2026-08');
  });

  it('переносит последний день месяца в следующий месяц', () => {
    expect(monthKeyOf(new Date('2026-08-31T21:00:00.000Z'))).toBe('2026-09');
  });

  it('показывает полночь как 00:00, а не 24:00', () => {
    expect(timeOf(new Date('2026-08-23T21:00:00.000Z'))).toBe('00:00');
  });
});

describe('разбор параметров адреса', () => {
  it('принимает корректные ключи', () => {
    expect(parseMonthKey('2026-08')).toBe('2026-08');
    expect(parseDayKey('2028-02-29')).toBe('2028-02-29'); // високосный
  });

  it('отклоняет несуществующие даты и мусор', () => {
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(parseMonthKey('август')).toBeNull();
    expect(parseMonthKey('2026-8')).toBeNull();
    expect(parseDayKey('2028-02-30')).toBeNull();
    expect(parseDayKey('2026-02-29')).toBeNull(); // невисокосный
    expect(parseDayKey('2026-08-32')).toBeNull();
  });
});

describe('соседний месяц', () => {
  it('переходит через границу года', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('сетка месяца', () => {
  it('всегда шесть недель по семь дней', () => {
    for (const month of ['2026-02', '2026-08', '2027-05']) {
      const weeks = monthGrid(month);
      expect(weeks).toHaveLength(6);
      expect(weeks.every((week) => week.length === 7)).toBe(true);
    }
  });

  it('начинается с понедельника и захватывает хвост прошлого месяца', () => {
    // 1 августа 2026 — суббота, значит строка начинается с 27 июля
    const weeks = monthGrid('2026-08');

    expect(weeks[0]?.[0]?.key).toBe('2026-07-27');
    expect(weeks[0]?.[0]?.inMonth).toBe(false);
    expect(weeks[0]?.[5]?.key).toBe('2026-08-01');
    expect(weeks[0]?.[5]?.inMonth).toBe(true);
  });

  it('не назначает выходных сама: в монтаже работают и в субботу', () => {
    const days = monthGrid('2026-08').flat();

    // единственные признаки дня — его ключ, число и принадлежность месяцу
    expect(Object.keys(days[0] ?? {}).sort()).toEqual(['day', 'inMonth', 'key']);
  });

  it('идёт днями подряд без пропусков', () => {
    const days = monthGrid('2026-02').flat();
    const stamps = days.map((day) => Date.parse(`${day.key}T00:00:00.000Z`));

    expect(
      stamps.every((at, index) => index === 0 || at - (stamps[index - 1] ?? 0) === 86_400_000),
    );
  });
});

describe('день недели', () => {
  it('считает по ISO-8601: понедельник — 1, воскресенье — 7', () => {
    // 24 августа 2026 — понедельник
    expect(weekdayOf('2026-08-24')).toBe(1);
    expect(weekdayOf('2026-08-26')).toBe(3);
    expect(weekdayOf('2026-08-30')).toBe(7);
  });

  it('не зависит от пояса машины: ключ дня уже календарная дата', () => {
    expect(weekdayOf('2026-01-01')).toBe(4);
    expect(weekdayOf('2028-02-29')).toBe(2);
  });
});

describe('границы выборки', () => {
  it('накрывает всю сетку, включая хвосты', () => {
    const { from, to } = gridRange('2026-08');

    // сетка начинается 27 июля: московская полночь — это 21:00 UTC накануне
    expect(from.toISOString()).toBe('2026-07-26T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-06T21:00:00.000Z');
  });

  it('день — ровно сутки от местной полуночи', () => {
    const { from, to } = dayRange('2026-08-23');

    expect(from.toISOString()).toBe('2026-08-22T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-23T21:00:00.000Z');
  });
});

describe('местное время → момент', () => {
  it('переводит московское время в UTC', () => {
    expect(momentOf('2026-08-23', '14:30').toISOString()).toBe('2026-08-23T11:30:00.000Z');
  });

  it('возвращает то же местное время обратно', () => {
    const at = momentOf('2026-12-31', '23:45');

    expect(dayKeyOf(at)).toBe('2026-12-31');
    expect(timeOf(at)).toBe('23:45');
  });

  it('не зависит от часового пояса машины', () => {
    // тот же расчёт в поясе с другим знаком смещения даёт другой момент,
    // но местное время читается тем же — это и требуется от календаря
    const at = momentOf('2026-08-23', '09:00', 'America/New_York');

    expect(at.toISOString()).toBe('2026-08-23T13:00:00.000Z');
    expect(timeOf(at, 'America/New_York')).toBe('09:00');
  });
});

describe('соседний день', () => {
  it('переходит через границу месяца и года', () => {
    expect(shiftDay('2026-08-31', 1)).toBe('2026-09-01');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('знает про високосный год', () => {
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('неделя', () => {
  it('начинается с понедельника', () => {
    // 23 августа 2026 — воскресенье, его неделя начинается 17-го
    expect(weekStartOf('2026-08-23')).toBe('2026-08-17');
    expect(weekStartOf('2026-08-17')).toBe('2026-08-17');
  });

  it('даёт семь дней подряд', () => {
    const week = weekGrid('2026-08-19');

    expect(week).toHaveLength(7);
    expect(week[0]?.key).toBe('2026-08-17');
    expect(week[6]?.key).toBe('2026-08-23');
    expect(week.map((day) => day.day)).toEqual([17, 18, 19, 20, 21, 22, 23]);
  });

  it('отмечает хвост соседнего месяца на стыке', () => {
    // неделя 31 августа — 6 сентября 2026
    const week = weekGrid('2026-08-31');

    expect(week[0]?.inMonth).toBe(true);
    expect(week[1]?.key).toBe('2026-09-01');
    expect(week[1]?.inMonth).toBe(false);
  });

  it('листается по семь дней', () => {
    expect(shiftWeek('2026-08-19', 1)).toBe('2026-08-26');
    expect(shiftWeek('2026-08-19', -1)).toBe('2026-08-12');
  });

  it('накрывает ровно семь суток от местной полуночи', () => {
    const { from, to } = weekRange('2026-08-19');

    // понедельник 17 августа 00:00 в Туле — это 16 августа 21:00 UTC
    expect(from.toISOString()).toBe('2026-08-16T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-23T21:00:00.000Z');
  });
});

describe('минуты от местной полуночи', () => {
  it('считает в поясе работ, а не в UTC', () => {
    expect(minutesOfDay(new Date('2026-08-23T11:30:00.000Z'))).toBe(14 * 60 + 30);
  });

  it('полночь по Москве — ноль, а не 180', () => {
    expect(minutesOfDay(new Date('2026-08-23T21:00:00.000Z'))).toBe(0);
  });
});
