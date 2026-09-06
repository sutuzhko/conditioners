import { describe, expect, it } from 'vitest';

import { columnShift, dayOfDrop, isDraggable } from './drag';
import { dayNote, monthEvents, monthLeads, monthOrders, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem } from './schedule';

const DAY = '2026-08-23';
const WEEK = [
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-20',
  '2026-08-21',
  '2026-08-22',
  '2026-08-23',
];

function itemsOf(): readonly ScheduleItem[] {
  const column = dayColumns(
    {
      events: [...monthEvents, dayNote],
      orders: monthOrders,
      leads: monthLeads,
      blocks: [],
      viewerId,
      today: DAY,
    },
    DAY,
  )[0];

  return [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
}

function pick(entity: ScheduleItem['entity']): ScheduleItem {
  const found = itemsOf().find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}» в фикстурах`);
  return found;
}

describe('Что переносится перетаскиванием', () => {
  it('дело переносится: у него нет ни монтажника, ни денег, ни уведомления', () => {
    expect(isDraggable(pick('event'))).toBe(true);
  });

  it('🔴 наряд не переносится — его место определяет свой раздел (ADR-093)', () => {
    expect(isDraggable(pick('order'))).toBe(false);
  });

  it('🔴 заявка не переносится: календарь показывает её, но не управляет ею', () => {
    expect(isDraggable(pick('lead'))).toBe(false);
  });

  it('чужая запись не переносится, даже если это дело', () => {
    const foreign: ScheduleItem = { ...pick('event'), edit: null };

    expect(isDraggable(foreign)).toBe(false);
  });
});

describe('Сдвиг по колонкам', () => {
  it('считает колонки от ширины одной колонки, а не от пикселей', () => {
    expect(columnShift(240, 120)).toBe(2);
    expect(columnShift(-240, 120)).toBe(-2);
  });

  it('округляет к ближайшей колонке: курсор редко попадает в её середину', () => {
    expect(columnShift(70, 120)).toBe(1);
    expect(columnShift(50, 120)).toBe(0);
  });

  it('не делит на ноль: неизмеренная колонка не двигает запись', () => {
    expect(columnShift(240, 0)).toBe(0);
  });
});

describe('День, на который запись отпустили', () => {
  it('меняет день на соседний', () => {
    expect(dayOfDrop(WEEK, '2026-08-20', 1)).toBe('2026-08-21');
    expect(dayOfDrop(WEEK, '2026-08-20', -2)).toBe('2026-08-18');
  });

  it('🔴 не выпускает запись за край показанного: там дня под курсором нет', () => {
    expect(dayOfDrop(WEEK, '2026-08-23', 3)).toBe('2026-08-23');
    expect(dayOfDrop(WEEK, '2026-08-17', -3)).toBe('2026-08-17');
  });

  it('в виде дня колонка одна — переносить некуда', () => {
    expect(dayOfDrop([DAY], DAY, 4)).toBe(DAY);
  });

  it('незнакомый день остаётся собой: колонка ушла, пока запись тащили', () => {
    expect(dayOfDrop(WEEK, '2026-09-01', 1)).toBe('2026-09-01');
  });
});
