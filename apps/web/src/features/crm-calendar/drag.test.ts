import { describe, expect, it } from 'vitest';

import { columnShift, dayOfDrop, isDraggable, movedBlock, rangeShift } from './drag';
import {
  dayNote,
  foreignVacationBlock,
  monthEvents,
  monthLeads,
  monthOrders,
  vacationBlock,
  viewerId,
  weeklyBlock,
} from './fixtures';
import type { DayBlockCard, DayBlockDraft } from './model';
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

/** Отлучка в том виде, в каком её отдаёт раскладка на выбранный день. */
function blockOn(day: string, block: DayBlockCard): ScheduleItem {
  /* Чужая отлучка приходит слоем занятости команды (ADR-123), и без списка
     людей её в колонке нет вовсе. */
  const team = [{ id: block.userId, name: block.userName, login: block.userId }];
  const column = dayColumns(
    { events: [], orders: [], leads: [], blocks: [block], viewerId, today: day, team },
    day,
  )[0];

  const found = [
    ...(column?.allDay ?? []),
    ...(column?.timed ?? []).map((placed) => placed.item),
  ][0];
  if (found === undefined) throw new Error(`отлучка не попала в сетку ${day}`);
  return found;
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

describe('Что переносится перетаскиванием — отлучка', () => {
  it('🔴 разовая отлучка переносится: у неё есть даты, и двигать их некому больше', () => {
    expect(isDraggable(blockOn('2026-08-24', vacationBlock))).toBe(true);
  });

  it('🔴 повторяемая занятость не переносится: у неё день недели, а не даты', () => {
    /* «Каждый четверг» не лежит на календарной оси — сдвинуть её на день
       значило бы сменить день недели, то есть править повтор, а не переносить
       запись. Это делает форма, где виден сам повтор (ADR-165). */
    expect(isDraggable(blockOn('2026-08-20', weeklyBlock))).toBe(false);
  });

  it('чужая отлучка не переносится: снять и подвинуть её может только хозяин', () => {
    expect(isDraggable(blockOn('2026-08-26', foreignVacationBlock))).toBe(false);
  });
});

describe('Сдвиг диапазона по колонкам', () => {
  /** Неделя 24–30 августа: отпуск 19 августа — 1 сентября накрывает её целиком. */
  const SHOWN = [
    '2026-08-24',
    '2026-08-25',
    '2026-08-26',
    '2026-08-27',
    '2026-08-28',
    '2026-08-29',
    '2026-08-30',
  ];

  it('🔴 отлучка, начавшаяся до показанной недели, едет и влево тоже', () => {
    /* Полоса обрезана краем недели, и её первый видимый день — понедельник.
       Зажми сдвиг по нему, и отпуск перестал бы двигаться назад вовсе. */
    expect(rangeShift(SHOWN, '2026-08-19', '2026-09-01', -1)).toBe(-1);
  });

  it('🔴 диапазон не уезжает с экрана целиком: хотя бы один день остаётся виден', () => {
    expect(rangeShift(SHOWN, '2026-08-24', '2026-08-26', 9)).toBe(6);
    expect(rangeShift(SHOWN, '2026-08-24', '2026-08-26', -9)).toBe(-2);
  });

  it('однодневная отлучка зажимается так же, как дело', () => {
    expect(rangeShift(SHOWN, '2026-08-26', '2026-08-26', 5)).toBe(4);
    expect(rangeShift(SHOWN, '2026-08-26', '2026-08-26', -5)).toBe(-2);
  });

  it('переносить некуда, пока колонок нет', () => {
    expect(rangeShift([], '2026-08-26', '2026-08-26', 2)).toBe(0);
  });

  it('🔴 в виде дня колонка одна — диапазон не едет даже обрезанным', () => {
    expect(rangeShift(['2026-08-26'], '2026-08-19', '2026-09-01', 1)).toBe(0);
  });
});

describe('Диапазон отлучки после переноса', () => {
  const vacation: DayBlockDraft = {
    repeat: 'once',
    day: '2026-09-02',
    endDay: '2026-09-15',
    weekday: 3,
    allDay: true,
    from: '10:00',
    to: '12:00',
    reason: 'Отпуск',
  };

  it('🔴 едет целиком: оба конца сдвигаются на один и тот же день', () => {
    const moved = movedBlock(vacation, 1);

    expect(moved.day).toBe('2026-09-03');
    expect(moved.endDay).toBe('2026-09-16');
  });

  it('🔴 длительность сохраняется и через границу месяца', () => {
    const moved = movedBlock(vacation, -5);

    expect(moved.day).toBe('2026-08-28');
    expect(moved.endDay).toBe('2026-09-10');
  });

  it('пустой конец значит «в тот же день» и пустым остаётся', () => {
    const moved = movedBlock({ ...vacation, endDay: '' }, 2);

    expect(moved.day).toBe('2026-09-04');
    expect(moved.endDay).toBe('');
  });

  it('остальные поля черновика перенос не трогает', () => {
    expect(movedBlock(vacation, 3)).toStrictEqual({
      ...vacation,
      day: '2026-09-05',
      endDay: '2026-09-18',
    });
  });

  it('🔴 повторяемую занятость перенос не меняет: дат у неё нет', () => {
    const weekly: DayBlockDraft = { ...vacation, repeat: 'weekly', day: '2026-08-20', endDay: '' };

    expect(movedBlock(weekly, 4)).toStrictEqual(weekly);
  });
});
