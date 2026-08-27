import { describe, expect, it } from 'vitest';

import {
  busyClash,
  clashesWith,
  clashingIds,
  laneOf,
  loadMinutes,
  overlaps,
  spanOf,
  type Booking,
} from './load';

/** Наряд Дмитрия с 10:00 на два часа и прочие короткие заготовки. */
function booking(
  id: string,
  ownerId: string | null,
  fromMin: number,
  durationMin: number,
): Booking {
  return { id, ownerId, ...spanOf(fromMin, durationMin) };
}

const H = 60;

describe('промежуток по началу и длительности', () => {
  it('складывает начало с длительностью', () => {
    expect(spanOf(10 * H, 90)).toEqual({ fromMin: 600, toMin: 690 });
  });

  it('не выпускает конец за пределы суток', () => {
    expect(spanOf(23 * H, 3 * H)).toEqual({ fromMin: 1380, toMin: 1440 });
  });

  it('нулевая длительность даёт пустой промежуток, а не отрицательный', () => {
    expect(spanOf(10 * H, 0)).toEqual({ fromMin: 600, toMin: 600 });
  });
});

describe('пересечение промежутков', () => {
  it('видит наложение', () => {
    expect(overlaps(spanOf(10 * H, 2 * H), spanOf(11 * H, 2 * H))).toBe(true);
  });

  it('🔴 соприкосновение не считает спором: в 16:00 закончил, в 16:00 начал', () => {
    expect(overlaps(spanOf(14 * H, 2 * H), spanOf(16 * H, 2 * H))).toBe(false);
  });

  it('вложенный промежуток тоже спорит', () => {
    expect(overlaps(spanOf(10 * H, 4 * H), spanOf(11 * H, H))).toBe(true);
  });

  it('пустой промежуток не спорит ни с чем', () => {
    expect(overlaps(spanOf(10 * H, 0), spanOf(9 * H, 3 * H))).toBe(false);
  });
});

describe('кто с кем спорит', () => {
  it('находит обе стороны пересечения', () => {
    const found = clashingIds([
      booking('a', 'u2', 10 * H, 2 * H),
      booking('b', 'u2', 11 * H, 2 * H),
      booking('c', 'u2', 16 * H, H),
    ]);

    expect([...found].sort()).toEqual(['a', 'b']);
  });

  it('🔴 не складывает разных людей: две бригады работают одновременно', () => {
    const found = clashingIds([
      booking('a', 'u2', 10 * H, 2 * H),
      booking('b', 'u3', 10 * H, 2 * H),
    ]);

    expect(found.size).toBe(0);
  });

  it('наряд без исполнителя ни с чем не спорит — назначать ещё некому', () => {
    const found = clashingIds([
      booking('a', null, 10 * H, 2 * H),
      booking('b', null, 10 * H, 2 * H),
    ]);

    expect(found.size).toBe(0);
  });

  it('тройное наложение отмечает все три записи', () => {
    const found = clashingIds([
      booking('a', 'u2', 10 * H, 4 * H),
      booking('b', 'u2', 11 * H, H),
      booking('c', 'u2', 12 * H, H),
    ]);

    expect(found.size).toBe(3);
  });
});

describe('с чем спорит новая запись', () => {
  const day = [
    booking('a', 'u2', 10 * H, 2 * H),
    booking('b', 'u3', 13 * H, 2 * H),
    booking('c', 'u2', 16 * H, 2 * H),
  ];

  it('называет только наряды того же человека', () => {
    const found = clashesWith(spanOf(11 * H, 3 * H), 'u2', day);

    expect(found.map((item) => item.id)).toEqual(['a']);
  });

  it('исполнитель не выбран — сравнивать не с чем', () => {
    expect(clashesWith(spanOf(11 * H, 3 * H), null, day)).toEqual([]);
  });

  it('свободное окно споров не даёт', () => {
    expect(clashesWith(spanOf(12 * H, 2 * H), 'u2', day)).toEqual([]);
  });
});

describe('загрузка человека за день', () => {
  it('складывает промежутки', () => {
    expect(loadMinutes([spanOf(10 * H, 2 * H), spanOf(14 * H, 90)])).toBe(210);
  });

  it('🔴 не считает пересечение дважды: две ошибки в плане — не четыре часа работы', () => {
    expect(loadMinutes([spanOf(10 * H, 2 * H), spanOf(11 * H, 2 * H)])).toBe(3 * H);
  });

  it('вложенный промежуток ничего не добавляет', () => {
    expect(loadMinutes([spanOf(10 * H, 4 * H), spanOf(11 * H, H)])).toBe(4 * H);
  });

  it('пустой день — ноль', () => {
    expect(loadMinutes([])).toBe(0);
  });
});

describe('раскладка колонки', () => {
  it('непересекающиеся записи занимают колонку целиком', () => {
    const placed = laneOf([spanOf(10 * H, H), spanOf(12 * H, H)]);

    expect(placed.map((entry) => entry.lanes)).toEqual([1, 1]);
    expect(placed.map((entry) => entry.lane)).toEqual([0, 0]);
  });

  it('два пересекающихся встают рядом', () => {
    const placed = laneOf([spanOf(10 * H, 2 * H), spanOf(11 * H, 2 * H)]);

    expect(placed.map((entry) => entry.lane)).toEqual([0, 1]);
    expect(placed.every((entry) => entry.lanes === 2)).toBe(true);
  });

  it('освободившаяся дорожка переиспользуется', () => {
    const placed = laneOf([spanOf(10 * H, 4 * H), spanOf(10 * H, H), spanOf(12 * H, H)]);
    const laneOfSpan = (fromMin: number): number | undefined =>
      placed.find((entry) => entry.item.fromMin === fromMin)?.lane;

    // 10:00–11:00 и 12:00–13:00 между собой не спорят и делят одну дорожку
    expect(laneOfSpan(12 * H)).toBe(laneOfSpan(10 * H));
    expect(placed.every((entry) => entry.lanes === 2)).toBe(true);
  });

  it('идёт по времени начала, а не по порядку в списке', () => {
    const placed = laneOf([spanOf(14 * H, H), spanOf(9 * H, H)]);

    expect(placed.map((entry) => entry.item.fromMin)).toEqual([9 * H, 14 * H]);
  });

  it('соседние кучки не делят ширину: вторая начинается после первой', () => {
    const placed = laneOf([spanOf(10 * H, 2 * H), spanOf(11 * H, 2 * H), spanOf(15 * H, H)]);

    expect(placed[2]?.lanes).toBe(1);
  });
});

describe('спор с занятостью', () => {
  it('закрытый целиком день спорит с любым выездом', () => {
    expect(busyClash({ state: 'full', reasons: ['Отпуск'] }, spanOf(10 * H, H))).toBe(true);
  });

  it('свободный день не спорит', () => {
    expect(busyClash({ state: 'free' }, spanOf(10 * H, H))).toBe(false);
  });

  it('окно спорит только с тем, что в него попадает', () => {
    const busy = {
      state: 'partial',
      windows: [{ fromMin: 14 * H, toMin: 16 * H, reasons: ['Врач'] }],
    } as const;

    expect(busyClash(busy, spanOf(15 * H, H))).toBe(true);
    expect(busyClash(busy, spanOf(16 * H, H))).toBe(false);
    expect(busyClash(busy, spanOf(12 * H, H))).toBe(false);
  });
});
