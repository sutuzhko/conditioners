import { describe, expect, it } from 'vitest';

import { blocksOn, busyAt, busyOn, minutesOfTime, timeOfMinutes } from './busy';
import type { DayBlockLike } from './busy';

/** 26 августа 2026 — среда, 24 августа — понедельник. */
const WEDNESDAY = '2026-08-26';
const MONDAY = '2026-08-24';

function once(day: string, extra: Partial<DayBlockLike> = {}): DayBlockLike {
  return { repeat: 'once', day, weekday: null, fromMin: null, toMin: null, reason: null, ...extra };
}

function weekly(weekday: number, extra: Partial<DayBlockLike> = {}): DayBlockLike {
  return {
    repeat: 'weekly',
    day: null,
    weekday,
    fromMin: null,
    toMin: null,
    reason: null,
    ...extra,
  };
}

describe('перевод времени в минуты', () => {
  it('переводит туда и обратно', () => {
    expect(minutesOfTime('14:30')).toBe(870);
    expect(timeOfMinutes(870)).toBe('14:30');
    expect(minutesOfTime('00:00')).toBe(0);
    expect(timeOfMinutes(0)).toBe('00:00');
  });

  it('не выпускает значение за сутки: поле времени такое не покажет', () => {
    expect(timeOfMinutes(9999)).toBe('23:59');
    expect(timeOfMinutes(-5)).toBe('00:00');
    expect(minutesOfTime('чушь')).toBe(0);
  });
});

describe('занятость, попавшая на день', () => {
  it('разовая берётся по дате, повторяемая — по дню недели', () => {
    const blocks = [once(WEDNESDAY), weekly(3), weekly(1), once(MONDAY)];

    expect(blocksOn(WEDNESDAY, blocks)).toEqual([once(WEDNESDAY), weekly(3)]);
  });

  it('день без записей пуст', () => {
    expect(blocksOn('2026-08-25', [once(WEDNESDAY), weekly(3)])).toEqual([]);
  });
});

describe('разрешение занятости', () => {
  it('день без записей свободен', () => {
    expect(busyOn(WEDNESDAY, [])).toEqual({ state: 'free' });
  });

  it('запись без окна закрывает день целиком и называет причину', () => {
    const busy = busyOn(WEDNESDAY, [once(WEDNESDAY, { reason: 'Семейные дела' })]);

    expect(busy).toEqual({ state: 'full', reasons: ['Семейные дела'] });
  });

  it('повторяемая запись закрывает каждую такую среду', () => {
    const wednesdays = [weekly(3, { reason: 'Выходной' })];

    expect(busyOn(WEDNESDAY, wednesdays).state).toBe('full');
    expect(busyOn('2026-09-02', wednesdays).state).toBe('full');
    expect(busyOn(MONDAY, wednesdays).state).toBe('free');
  });

  it('окно часов оставляет день рабочим', () => {
    const busy = busyOn(WEDNESDAY, [once(WEDNESDAY, { fromMin: 840, toMin: 960, reason: 'Врач' })]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [{ fromMin: 840, toMin: 960, reasons: ['Врач'] }],
    });
  });

  it('пересекающиеся окна складываются в одно', () => {
    const busy = busyOn(WEDNESDAY, [
      once(WEDNESDAY, { fromMin: 600, toMin: 720, reason: 'Врач' }),
      once(WEDNESDAY, { fromMin: 660, toMin: 810, reason: 'Школа' }),
    ]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [{ fromMin: 600, toMin: 810, reasons: ['Врач', 'Школа'] }],
    });
  });

  it('соприкасающиеся окна тоже сливаются — перерыва между ними нет', () => {
    const busy = busyOn(WEDNESDAY, [
      once(WEDNESDAY, { fromMin: 600, toMin: 720 }),
      once(WEDNESDAY, { fromMin: 720, toMin: 840 }),
    ]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [{ fromMin: 600, toMin: 840, reasons: [] }],
    });
  });

  it('раздельные окна остаются раздельными', () => {
    const busy = busyOn(WEDNESDAY, [
      once(WEDNESDAY, { fromMin: 540, toMin: 600, reason: 'Врач' }),
      once(WEDNESDAY, { fromMin: 900, toMin: 990, reason: 'Школа' }),
    ]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [
        { fromMin: 540, toMin: 600, reasons: ['Врач'] },
        { fromMin: 900, toMin: 990, reasons: ['Школа'] },
      ],
    });
  });

  it('повторяемая запись, попавшая на разовую, объединяется с ней', () => {
    const busy = busyOn(WEDNESDAY, [
      weekly(3, { fromMin: 540, toMin: 720, reason: 'Учёба' }),
      once(WEDNESDAY, { fromMin: 700, toMin: 900, reason: 'Врач' }),
    ]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [{ fromMin: 540, toMin: 900, reasons: ['Учёба', 'Врач'] }],
    });
  });

  it('закрытый целиком день перебивает часовые записи того же дня', () => {
    const busy = busyOn(WEDNESDAY, [
      once(WEDNESDAY, { fromMin: 540, toMin: 600, reason: 'Врач' }),
      weekly(3, { reason: 'Выходной' }),
    ]);

    expect(busy).toEqual({ state: 'full', reasons: ['Выходной'] });
  });

  it('одну и ту же причину не повторяет дважды', () => {
    const busy = busyOn(WEDNESDAY, [
      once(WEDNESDAY, { reason: 'Отпуск' }),
      weekly(3, { reason: 'Отпуск' }),
    ]);

    expect(busy).toEqual({ state: 'full', reasons: ['Отпуск'] });
  });
});

describe('попадание времени в занятое окно', () => {
  const day = busyOn(WEDNESDAY, [once(WEDNESDAY, { fromMin: 840, toMin: 960 })]);

  it('внутри окна — занят, снаружи — нет', () => {
    expect(busyAt(day, 840)).toBe(true);
    expect(busyAt(day, 900)).toBe(true);
    expect(busyAt(day, 839)).toBe(false);
  });

  it('конец окна свободен: дело на 16:00 после «до 16:00» ни с чем не спорит', () => {
    expect(busyAt(day, 960)).toBe(false);
  });

  it('закрытый целиком день занят в любую минуту, свободный — ни в одну', () => {
    expect(busyAt(busyOn(WEDNESDAY, [weekly(3)]), 0)).toBe(true);
    expect(busyAt(busyOn(WEDNESDAY, []), 720)).toBe(false);
  });
});

describe('занятость по нарядам и отлучкам вместе', () => {
  it('🔴 наряд занимает время так же, как отлучка (ADR-123)', () => {
    const busy = busyOn('2026-08-24', [], [{ fromMin: 600, toMin: 780, reason: 'Наряд № 1059' }]);

    expect(busy).toEqual({
      state: 'partial',
      windows: [{ fromMin: 600, toMin: 780, reasons: ['Наряд № 1059'] }],
    });
  });

  it('складывает окно врача и окно монтажа в один ответ', () => {
    const doctor = {
      repeat: 'once' as const,
      day: '2026-08-24',
      weekday: null,
      fromMin: 840,
      toMin: 960,
      reason: 'Врач',
    };

    const busy = busyOn(
      '2026-08-24',
      [doctor],
      [{ fromMin: 600, toMin: 780, reason: 'Наряд № 1059' }],
    );

    expect(busy.state).toBe('partial');
    expect(busy.state === 'partial' ? busy.windows.map((w) => w.fromMin) : []).toEqual([600, 840]);
  });

  it('соприкасающиеся наряд и отлучка сливаются в один промежуток', () => {
    const busy = busyOn(
      '2026-08-24',
      [
        {
          repeat: 'once',
          day: '2026-08-24',
          weekday: null,
          fromMin: 780,
          toMin: 900,
          reason: 'Врач',
        },
      ],
      [{ fromMin: 600, toMin: 780, reason: 'Наряд № 1059' }],
    );

    expect(busy.state === 'partial' ? busy.windows : []).toEqual([
      { fromMin: 600, toMin: 900, reasons: ['Наряд № 1059', 'Врач'] },
    ]);
  });

  it('закрытый целиком день перебивает наряды: человека нет, кто бы что ни назначил', () => {
    const off = {
      repeat: 'once' as const,
      day: '2026-08-24',
      weekday: null,
      fromMin: null,
      toMin: null,
      reason: 'Отпуск',
    };

    expect(busyOn('2026-08-24', [off], [{ fromMin: 600, toMin: 780, reason: 'Наряд' }])).toEqual({
      state: 'full',
      reasons: ['Отпуск'],
    });
  });

  it('наряд нулевой длительности никого не занимает', () => {
    expect(busyOn('2026-08-24', [], [{ fromMin: 600, toMin: 600, reason: 'Наряд' }])).toEqual({
      state: 'free',
    });
  });

  it('без нарядов ведёт себя как прежде — источник добавился, расчёт не раздвоился', () => {
    expect(busyOn('2026-08-24', [])).toEqual({ state: 'free' });
  });
});
