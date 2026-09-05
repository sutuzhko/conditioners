import { describe, expect, it } from 'vitest';

import { installerOrder, photos } from './fixtures';
import {
  agendaGroups,
  agendaSummary,
  agendaWindow,
  installerStep,
  installerWhenFromParam,
  parseExtraWork,
  photosLeft,
  routeHref,
} from './installer-model';

describe('окно наряда дня', () => {
  it('умолчание — сегодня; мусор в адресе его не меняет', () => {
    expect(installerWhenFromParam(undefined)).toBe('today');
    expect(installerWhenFromParam('вчера')).toBe('today');
    expect(installerWhenFromParam('week')).toBe('week');
  });

  it('«завтра» — один день, сдвинутый на сутки вперёд', () => {
    expect(agendaWindow('tomorrow', '2026-08-28')).toEqual({ from: '2026-08-29', days: 1 });
  });

  it('«неделя» — семь дней от сегодняшнего', () => {
    expect(agendaWindow('week', '2026-08-28')).toEqual({ from: '2026-08-28', days: 7 });
  });
});

describe('🔴 группировка наряда дня — по времени, а не по состоянию (issue #633)', () => {
  const first = { ...installerOrder, id: 'a1', at: '2026-08-28T06:00:00.000Z' };
  const second = {
    ...installerOrder,
    id: 'a2',
    at: '2026-08-28T13:00:00.000Z',
    status: 'done' as const,
  };
  const next = { ...installerOrder, id: 'a3', at: '2026-08-29T07:00:00.000Z' };

  it('наряды одного дня лежат в одной группе, разных — в разных', () => {
    const groups = agendaGroups([first, second, next]);

    expect(groups.map((group) => group.day)).toEqual(['2026-08-28', '2026-08-29']);
    expect(groups[0]?.orders.map((item) => item.id)).toEqual(['a1', 'a2']);
  });

  it('состояние наряда на группировку не влияет: выполненный остаётся в своём дне', () => {
    const groups = agendaGroups([first, second]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.orders).toHaveLength(2);
  });

  it('пустой список групп не даёт', () => {
    expect(agendaGroups([])).toEqual([]);
  });
});

describe('сводка окна', () => {
  it('считает выезды и плановые часы, а не переработку', () => {
    const summary = agendaSummary([
      { ...installerOrder, durationMin: 120, overtimeMin: 90 },
      { ...installerOrder, durationMin: 180, overtimeMin: 0 },
    ]);

    expect(summary).toEqual({ count: 2, minutes: 300 });
  });
});

describe('шаг монтажника', () => {
  it('назначен — принять, в работе — сдавать, выполнен — закрыт', () => {
    expect(installerStep('assigned')).toBe('take');
    expect(installerStep('in_progress')).toBe('handover');
    expect(installerStep('done')).toBe('closed');
  });

  it('🔴 у нового и отменённого наряда действий нет: это решения владельца', () => {
    expect(installerStep('new')).toBe('none');
    expect(installerStep('cancelled')).toBe('none');
  });
});

describe('🔴 сколько снимков «после» ещё нужно (issue #632)', () => {
  it('считает остаток, а не «нужно два»', () => {
    expect(photosLeft([])).toBe(2);
    expect(photosLeft(photos.filter((photo) => photo.stage === 'before'))).toBe(2);
    expect(photosLeft(photos)).toBe(0);
  });

  it('снимки «до» в счёт не идут: их грузит владелец', () => {
    const before = [{ id: 'x', stage: 'before' as const, url: '/x', sort: 0 }];

    expect(photosLeft(before)).toBe(2);
  });

  it('лишние снимки в минус не уводят', () => {
    expect(photosLeft([...photos, { id: 'p9', stage: 'after', url: '/p9', sort: 2 }])).toBe(0);
  });
});

describe('разбор итога на трассу и короб', () => {
  it('берёт метры каждого куска, не путая их между собой', () => {
    expect(parseExtraWork('Доп. трасса 1,5 м, короб 60×60 — 2 м')).toEqual({
      trassaM: 1.5,
      boxM: 2,
    });
  });

  it('точка вместо запятой читается так же', () => {
    expect(parseExtraWork('трасса 3.5 м')).toEqual({ trassaM: 3.5, boxM: null });
  });

  it('🔴 миллиметры метрами не считаются: «изоляция 9 мм» — не длина трассы', () => {
    expect(parseExtraWork('трасса 9 мм изоляции')).toEqual({ trassaM: null, boxM: null });
  });

  it('чего в тексте нет, того нет и в разборе', () => {
    expect(parseExtraWork('Ничего сверх наряда')).toEqual({ trassaM: null, boxM: null });
    expect(parseExtraWork('')).toEqual({ trassaM: null, boxM: null });
  });

  it('порядок слов не важен', () => {
    expect(parseExtraWork('короб 4 м и трасса 2 м')).toEqual({ trassaM: 2, boxM: 4 });
  });
});

describe('маршрут до объекта', () => {
  it('адрес уходит в ссылку закодированным, а не как есть', () => {
    expect(routeHref('Тула, Первомайская, 12')).toBe(
      `https://yandex.ru/maps/?text=${encodeURIComponent('Тула, Первомайская, 12')}`,
    );
  });
});
