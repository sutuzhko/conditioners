import { describe, expect, it } from 'vitest';

import {
  clashingRepair,
  crowdedOrders,
  dayNote,
  dmitry,
  doctorBlock,
  installers,
  lateInstall,
  looseOrder,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  plannedCall,
  sergey,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import {
  DEFAULT_WORK_WINDOW,
  dayColumns,
  hourRangeOf,
  isOffHour,
  lanePlace,
  marksOf,
  monthColumns,
  monthRows,
  offsetPercent,
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

  it('шапка колонки знает день недели и число', () => {
    const columns = weekColumns(source(), SUNDAY);

    expect(columns[0]?.weekday).toBe('Пн');
    expect(columns[6]?.weekday).toBe('Вс');
    expect(columns[6]?.date).toBe(23);
  });

  it('отмечает сегодняшний день', () => {
    const columns = weekColumns(source({ today: '2026-08-19' }), SUNDAY);

    expect(columns.filter((column) => column.today).map((column) => column.day)).toEqual([
      '2026-08-19',
    ]);
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

  it('🔴 заявка живёт в полосе «весь день», пока ей не назначили время', () => {
    const column = dayColumns(source(), SUNDAY)[0];

    expect(column?.allDay.map((item) => item.entity)).toContain('lead');
    expect(column?.timed.some((placed) => placed.item.entity === 'lead')).toBe(false);
  });

  it('заметка «не забыть» тоже уходит в полосу: она висит на дне, а не на часе', () => {
    const column = dayColumns(source({ events: [dayNote] }), SUNDAY)[0];

    expect(column?.allDay.map((item) => item.id)).toContain(dayNote.id);
  });

  it('🔴 дело занимает столько, сколько сказано в его длительности', () => {
    const column = dayColumns(source({ events: [plannedCall], orders: [], leads: [] }), SUNDAY)[0];
    const call = column?.timed[0]?.item;

    // звонок в 10:00 на полчаса — это отрезок 600…630, а не точка
    expect(call?.fromMin).toBe(600);
    expect(call?.toMin).toBe(630);
    expect(call?.range).toBe('10:00–10:30');
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

  it('🔴 своя отлучка на часы стоит ровно на своих часах, а не «где-то в дне»', () => {
    const column = dayColumns(source({ blocks: [doctorBlock] }), '2026-08-24')[0];
    const away = column?.timed.find((placed) => placed.item.entity === 'block')?.item;

    expect(away?.fromMin).toBe(doctorBlock.fromMin);
    expect(away?.toMin).toBe(doctorBlock.toMin);
  });

  it('свою занятость можно править прямо из карточки, чужую — нет', () => {
    const own = dayColumns(source({ blocks: [doctorBlock] }), '2026-08-24')[0];
    const foreign = { ...doctorBlock, id: 'b9', userId: dmitry.id };
    const team = dayColumns(source({ blocks: [foreign], team: installers }), '2026-08-24')[0];

    expect(own?.timed.find((placed) => placed.item.entity === 'block')?.item.edit?.kind).toBe(
      'block',
    );
    expect(team?.timed.find((placed) => placed.item.entity === 'block')?.item.edit).toBeNull();
  });

  it('🔴 наряд из календаря не правится: он живёт в своём разделе (ADR-093)', () => {
    const column = dayColumns(source(), SUNDAY)[0];
    const order = column?.timed.find((placed) => placed.item.entity === 'order')?.item;

    expect(order?.edit).toBeNull();
    expect(order?.href).toBe(`/admin/orders/${morningInstall.id}`);
  });

  it('🔴 переработка берётся готовой с сервера и попадает в подпись (ADR-138)', () => {
    const column = dayColumns(source({ events: [lateInstall], orders: [], leads: [] }), SUNDAY)[0];
    const item = column?.timed[0]?.item;

    expect(item?.overtimeMin).toBe(lateInstall.overtimeMin);
    expect(item?.label).toContain('Переработка: 3 ч');
  });
});

describe('раскладка месяца', () => {
  it('даёт сорок две клетки — шесть недель, чтобы сетка не прыгала', () => {
    expect(monthColumns(source(), '2026-08')).toHaveLength(42);
  });

  it('хвост соседнего месяца остаётся настоящим днём', () => {
    const columns = monthColumns(source(), '2026-08');

    expect(columns[0]?.day).toBe('2026-07-27');
    expect(columns[0]?.outside).toBe(true);
  });

  it('🔴 строки клетки идут по времени, и время есть у каждой', () => {
    const columns = monthColumns(source({ leads: [], blocks: [] }), '2026-08');
    const sunday = columns.find((column) => column.day === SUNDAY);
    const rows = sunday === undefined ? [] : monthRows(sunday);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((item) => item.time !== '')).toBe(true);
    expect(rows.map((item) => item.fromMin)).toEqual(
      [...rows.map((item) => item.fromMin)].sort((left, right) => left - right),
    );
  });

  it('записи без времени идут первыми: они про день целиком', () => {
    const columns = monthColumns(source(), '2026-08');
    const sunday = columns.find((column) => column.day === SUNDAY);
    const rows = sunday === undefined ? [] : monthRows(sunday);

    expect(rows[0]?.entity).toBe('lead');
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

  it('закрытый целиком день не закрашивает колонку, а уходит в полосу «весь день»', () => {
    const off = { ...wholeDayBlock, userId: sergey.id, day: SUNDAY };
    const column = dayColumns(source({ team: installers, blocks: [off] }), SUNDAY)[0];

    expect(column?.allDay.some((item) => item.entity === 'block')).toBe(true);
    expect(column?.timed.some((placed) => placed.item.entity === 'block')).toBe(false);
  });

  it('неназначенный наряд остаётся ничьим — приписывать его некому', () => {
    const column = dayColumns(source({ team: installers }), '2026-08-25')[0];
    const loose = column?.timed.find((placed) => placed.item.id === looseOrder.id);

    expect(loose?.item.person).toBeNull();
  });
});

describe('окно часов и места записей', () => {
  it('🔴 сетка рисует сутки целиком: ночь доступна прокруткой, а не спрятана', () => {
    const range = hourRangeOf(DEFAULT_WORK_WINDOW);

    expect(range.hours).toHaveLength(24);
    expect(range.hours[0]).toBe(0);
    expect(range.hours[23]).toBe(23);
  });

  it('рабочее окно приходит настройкой, а не зашито в сетку', () => {
    const range = hourRangeOf({ fromMin: 8 * 60, toMin: 22 * 60 });

    expect(range.workFromMin).toBe(8 * 60);
    expect(range.workToMin).toBe(22 * 60);
  });

  it('часы за окном помечены нерабочими — иначе переработку неоткуда увидеть', () => {
    const range = hourRangeOf(DEFAULT_WORK_WINDOW);

    expect(isOffHour(range, 7)).toBe(true);
    expect(isOffHour(range, 9)).toBe(false);
    expect(isOffHour(range, 18)).toBe(false);
    expect(isOffHour(range, 19)).toBe(true);
  });

  it('доля считается от суток: час в сетке всегда на одном месте', () => {
    expect(offsetPercent(0)).toBe(0);
    expect(offsetPercent(12 * 60)).toBe(50);
    expect(offsetPercent(24 * 60)).toBe(100);
  });

  it('время вне суток прижимается к границам', () => {
    expect(offsetPercent(-60)).toBe(0);
    expect(offsetPercent(30 * 60)).toBe(100);
  });

  it('до трёх записей делят ширину поровну', () => {
    expect(lanePlace(0, 2)).toEqual({ leftPercent: 0, widthPercent: 50, depth: 0 });
    expect(lanePlace(1, 2)).toEqual({ leftPercent: 50, widthPercent: 50, depth: 1 });
  });

  it('🔴 когда записей много, они идут лесенкой с наложением, а не в нитку', () => {
    const first = lanePlace(0, 5);
    const last = lanePlace(4, 5);

    expect(first.widthPercent).toBe(100);
    expect(last.leftPercent).toBe(70);
    // поздняя запись лежит поверх ранних — её видно целиком
    expect(last.depth).toBeGreaterThan(first.depth);
  });

  it('пять выездов на одно время не сжимаются в невидимые полоски', () => {
    const column = dayColumns(source({ orders: crowdedOrders, events: [], leads: [] }), SUNDAY)[0];
    const places = (column?.timed ?? []).map((placed) => lanePlace(placed.lane, placed.lanes));

    expect(places.every((place) => place.widthPercent >= 30)).toBe(true);
  });
});
