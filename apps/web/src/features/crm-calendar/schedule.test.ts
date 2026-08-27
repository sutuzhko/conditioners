import { describe, expect, it } from 'vitest';

import {
  clashingRepair,
  dmitry,
  doctorBlock,
  installers,
  looseOrder,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  parallelService,
  sergey,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import {
  dayColumns,
  hourRangeOf,
  marksOf,
  offsetPercent,
  personBusy,
  teamDayLoad,
  weekColumns,
  type ScheduleSource,
} from './schedule';

/** 23 августа 2026 — воскресенье; его неделя начинается 17-го. */
const SUNDAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: SUNDAY,
    selected: SUNDAY,
    ...patch,
  };
}

describe('раскладка недели', () => {
  it('даёт семь колонок с понедельника', () => {
    const columns = weekColumns(source(), SUNDAY);

    expect(columns).toHaveLength(7);
    expect(columns[0]?.day).toBe('2026-08-17');
    expect(columns[6]?.day).toBe(SUNDAY);
  });

  it('разносит записи по дням в московском времени, а не в UTC', () => {
    const columns = weekColumns(source(), SUNDAY);
    const sunday = columns[6];

    // монтаж 07:00 UTC — это 10:00 в Туле того же дня
    expect(sunday?.timed.some((placed) => placed.item.id === morningInstall.id)).toBe(true);
  });

  it('🔴 наряды попадают в сетку наравне с делами и отличимы по сущности', () => {
    const sunday = weekColumns(source(), SUNDAY)[6];
    const items = sunday?.timed.map((placed) => placed.item) ?? [];

    expect(items.filter((item) => item.entity === 'order')).toHaveLength(3);
    expect(items.filter((item) => item.entity === 'event')).not.toHaveLength(0);
  });

  it('у наряда есть номер, у дела его нет — различие остаётся и без цвета', () => {
    const sunday = weekColumns(source(), SUNDAY)[6];
    const order = sunday?.timed.find((placed) => placed.item.entity === 'order')?.item;
    const event = sunday?.timed.find((placed) => placed.item.entity === 'event')?.item;

    expect(order?.number).toBe(morningInstall.number);
    expect(event?.number).toBeNull();
  });

  it('отмечает сегодняшний и выбранный день', () => {
    const columns = weekColumns(source({ today: '2026-08-19', selected: SUNDAY }), SUNDAY);

    expect(columns.find((column) => column.today)?.day).toBe('2026-08-19');
    expect(columns.find((column) => column.selected)?.day).toBe(SUNDAY);
  });

  it('называет колонку словами: цвет и полоса скринридеру ничего не говорят', () => {
    const columns = weekColumns(source({ blocks: [wholeDayBlock] }), '2026-08-26');
    const closed = columns.find((column) => column.day === '2026-08-26');

    expect(closed?.label).toContain('День закрыт');
  });

  it('пустая колонка так и называется — пустой', () => {
    const columns = weekColumns(source({ events: [], orders: [], leads: [] }), SUNDAY);

    expect(columns[0]?.label).toContain('Пусто');
  });

  it('чужая занятость колонку смотрящего не закрывает', () => {
    const foreign = monthBlocks.filter((block) => block.userId !== viewerId);
    const columns = weekColumns(source({ blocks: foreign }), SUNDAY);

    expect(columns.every((column) => column.busy.state === 'free')).toBe(true);
  });
});

describe('раскладка дня', () => {
  it('даёт одну колонку выбранного дня', () => {
    const columns = dayColumns(source(), SUNDAY);

    expect(columns).toHaveLength(1);
    expect(columns[0]?.day).toBe(SUNDAY);
  });

  it('🔴 заявки уходят в группу без времени: их никто не назначал на час', () => {
    const column = dayColumns(source(), SUNDAY)[0];

    expect(column?.untimed.map((item) => item.id)).toContain(monthLeads[0]?.id);
  });

  it('пересекающиеся наряды встают рядом, а не друг на друга', () => {
    const column = dayColumns(source(), SUNDAY)[0];
    const first = column?.timed.find((placed) => placed.item.id === morningInstall.id);
    const second = column?.timed.find((placed) => placed.item.id === clashingRepair.id);

    expect(first?.lanes).toBeGreaterThan(1);
    expect(first?.lane).not.toBe(second?.lane);
  });

  it('окно занятости попадает в подпись колонки', () => {
    const column = dayColumns(source({ blocks: [doctorBlock] }), '2026-08-24')[0];

    expect(column?.label).toContain('14:00–16:00');
  });
});

describe('наложение занятости команды', () => {
  const team = source({ team: installers });

  it('🔴 краска закреплена за человеком и не зависит от порядка в списке', () => {
    const straight = marksOf(installers);
    const reversed = marksOf([...installers].reverse());

    expect(reversed.get(dmitry.id)?.tone).toBe(straight.get(dmitry.id)?.tone);
  });

  it('🔴 цвет не единственный признак: рядом идут инициалы и имя целиком', () => {
    const mark = marksOf(installers).get(dmitry.id);

    expect(mark?.initials).toBe('ДС');
    expect(mark?.title).toBe(dmitry.name);
  });

  it('наряд в сетке помечен своим монтажником', () => {
    const column = dayColumns(team, SUNDAY)[0];
    const order = column?.timed.find((placed) => placed.item.id === morningInstall.id);

    expect(order?.item.person?.id).toBe(dmitry.id);
  });

  it('без наложения записи ничьи: краска остаётся по виду работ', () => {
    const column = dayColumns(source(), SUNDAY)[0];

    expect(column?.timed.every((placed) => placed.item.person === null)).toBe(true);
  });

  it('чужая отлучка ложится на ту же сетку отдельной записью', () => {
    const mine = { ...doctorBlock, userId: dmitry.id, day: SUNDAY };
    const column = dayColumns(source({ team: installers, blocks: [mine] }), SUNDAY)[0];
    const away = column?.timed.find((placed) => placed.item.entity === 'block');

    expect(away?.item.person?.id).toBe(dmitry.id);
    expect(away?.item.fromMin).toBe(doctorBlock.fromMin);
  });

  it('закрытый целиком день не закрашивает колонку, а уходит в группу без времени', () => {
    const off = { ...wholeDayBlock, userId: sergey.id, day: SUNDAY };
    const column = dayColumns(source({ team: installers, blocks: [off] }), SUNDAY)[0];

    expect(column?.untimed.some((item) => item.entity === 'block')).toBe(true);
    expect(column?.timed.some((placed) => placed.item.entity === 'block')).toBe(false);
  });

  it('неназначенный наряд остаётся ничьим — приписывать его некому', () => {
    const column = dayColumns(source({ team: installers }), '2026-08-25')[0];
    const loose = column?.timed.find((placed) => placed.item.id === looseOrder.id);

    expect(loose?.item.person).toBeNull();
  });
});

describe('занятость человека — наряды и отлучки вместе', () => {
  it('🔴 наряд занимает человека так же, как отлучка (ADR-123)', () => {
    const busy = personBusy(source(), SUNDAY, dmitry.id);

    expect(busy.state).toBe('partial');
    // монтаж 10:00–13:00 и ремонт 12:00–14:00 сливаются в одно окно
    expect(busy.state === 'partial' ? busy.windows : []).toHaveLength(1);
  });

  it('складывает врача и монтаж в один ответ', () => {
    // врач с 17:00 до 18:00 — отдельно от выездов, они кончаются в 14:00
    const mine = { ...doctorBlock, userId: dmitry.id, day: SUNDAY, fromMin: 1020, toMin: 1080 };
    const busy = personBusy(source({ blocks: [mine] }), SUNDAY, dmitry.id);

    expect(busy.state === 'partial' ? busy.windows.length : 0).toBe(2);
  });

  it('чужие наряды человека не занимают', () => {
    const busy = personBusy(source({ orders: [parallelService] }), SUNDAY, dmitry.id);

    expect(busy.state).toBe('free');
  });

  it('день без работы и без отлучек — свободен', () => {
    expect(personBusy(source(), '2026-08-19', dmitry.id).state).toBe('free');
  });
});

describe('занятость команды по дням — для клетки месяца', () => {
  it('называет занятых и молчит о свободных', () => {
    const load = teamDayLoad(source({ team: installers }), SUNDAY);

    expect(load.map((entry) => entry.person.id)).toEqual([dmitry.id, sergey.id]);
  });

  it('считает загрузку по нарядам и не удваивает наложение', () => {
    const load = teamDayLoad(source({ team: installers }), SUNDAY);

    // 10:00–13:00 и 12:00–14:00 у одного человека — четыре часа, а не пять
    expect(load[0]?.loadMin).toBe(240);
    expect(load[1]?.loadMin).toBe(90);
  });

  it('в свободный день полосок нет вовсе', () => {
    expect(teamDayLoad(source({ team: installers }), '2026-08-19')).toEqual([]);
  });

  it('отлучка попадает в полоски наравне с выездом', () => {
    const off = { ...wholeDayBlock, userId: sergey.id, day: '2026-08-19' };
    const load = teamDayLoad(source({ team: installers, blocks: [off] }), '2026-08-19');

    expect(load.map((entry) => entry.person.id)).toEqual([sergey.id]);
    expect(load[0]?.busy.state).toBe('full');
  });

  it('без наложения полосок нет: переключатель выключен', () => {
    expect(teamDayLoad(source(), SUNDAY)).toEqual([]);
  });
});

describe('окно часов', () => {
  it('по умолчанию рабочий день с восьми до восьми', () => {
    const columns = dayColumns(source({ events: [], orders: [], leads: [] }), SUNDAY);
    const range = hourRangeOf(columns);

    expect(range.fromMin).toBe(8 * 60);
    expect(range.toMin).toBe(20 * 60);
    expect(range.hours).toHaveLength(12);
  });

  it('расширяется под ранний выезд, а не прячет его', () => {
    const early = { ...morningInstall, at: '2026-08-23T03:30:00.000Z' }; // 06:30 в Туле
    const columns = dayColumns(source({ orders: [early], events: [], leads: [] }), SUNDAY);

    expect(hourRangeOf(columns).fromMin).toBe(6 * 60);
  });

  it('расширяется под поздний конец работ', () => {
    const late = { ...morningInstall, at: '2026-08-23T16:00:00.000Z', durationMin: 240 };
    const columns = dayColumns(source({ orders: [late], events: [], leads: [] }), SUNDAY);

    expect(hourRangeOf(columns).toMin).toBe(23 * 60);
  });

  it('доля окна считается от его начала, а не от полуночи', () => {
    const range = { fromMin: 8 * 60, toMin: 20 * 60, hours: [] };

    expect(offsetPercent(range, 8 * 60)).toBe(0);
    expect(offsetPercent(range, 14 * 60)).toBe(50);
    expect(offsetPercent(range, 20 * 60)).toBe(100);
  });

  it('время вне окна прижимается к его границам', () => {
    const range = { fromMin: 8 * 60, toMin: 20 * 60, hours: [] };

    expect(offsetPercent(range, 0)).toBe(0);
    expect(offsetPercent(range, 23 * 60)).toBe(100);
  });
});
