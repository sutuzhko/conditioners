import { describe, expect, it } from 'vitest';

import {
  crmEventCreateSchema,
  crmEventUpdateSchema,
  dayBlockCreateSchema,
  isCrmEventKind,
  isDayBlockRepeat,
} from './model';

const valid = {
  kind: 'measure',
  day: '2026-08-23',
  time: '14:30',
  clientName: 'Иван',
  clientPhone: '+7 (910) 123-45-67',
  address: 'Тула, Ленина 1',
  note: 'Второй этаж',
  leadId: null,
};

describe('заведение дела', () => {
  it('принимает заполненную форму', () => {
    const parsed = crmEventCreateSchema.safeParse(valid);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.clientName).toBe('Иван');
  });

  it('требует клиента: дело без человека не с кем делать', () => {
    const parsed = crmEventCreateSchema.safeParse({ ...valid, clientName: '   ' });

    expect(parsed.success).toBe(false);
  });

  it('пустые необязательные поля превращает в «не заполнено»', () => {
    const parsed = crmEventCreateSchema.safeParse({
      ...valid,
      clientPhone: '',
      address: '',
      note: '',
      leadId: '',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.clientPhone).toBeNull();
    expect(parsed.success && parsed.data.address).toBeNull();
    expect(parsed.success && parsed.data.note).toBeNull();
    expect(parsed.success && parsed.data.leadId).toBeNull();
  });

  it('отклоняет несуществующую дату', () => {
    expect(crmEventCreateSchema.safeParse({ ...valid, day: '2026-02-30' }).success).toBe(false);
  });

  it('отклоняет время не по часам', () => {
    for (const time of ['24:00', '9:30', '14:60', 'утром']) {
      expect(crmEventCreateSchema.safeParse({ ...valid, time }).success).toBe(false);
    }
  });

  it('отклоняет незнакомый вид дела', () => {
    expect(crmEventCreateSchema.safeParse({ ...valid, kind: 'ремонт' }).success).toBe(false);
    expect(isCrmEventKind('ремонт')).toBe(false);
    expect(isCrmEventKind('install')).toBe(true);
  });
});

describe('правка дела', () => {
  it('принимает один статус — «сделано» жмут прямо в списке', () => {
    const parsed = crmEventUpdateSchema.safeParse({ status: 'done' });

    expect(parsed.success).toBe(true);
  });

  it('не принимает пустую правку', () => {
    expect(crmEventUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('переносит дату только вместе со временем', () => {
    expect(crmEventUpdateSchema.safeParse({ day: '2026-09-01' }).success).toBe(false);
    expect(crmEventUpdateSchema.safeParse({ time: '09:00' }).success).toBe(false);
    expect(crmEventUpdateSchema.safeParse({ day: '2026-09-01', time: '09:00' }).success).toBe(true);
  });

  it('не принимает выдуманный статус', () => {
    expect(crmEventUpdateSchema.safeParse({ status: 'забыто' }).success).toBe(false);
  });
});

const onceBlock = {
  repeat: 'once',
  day: '2026-08-26',
  weekday: null,
  fromMin: null,
  toMin: null,
  reason: 'Семейные дела',
};

const weeklyBlock = {
  repeat: 'weekly',
  day: null,
  weekday: 3,
  fromMin: null,
  toMin: null,
  reason: 'Выходной',
};

describe('заведение занятости', () => {
  it('принимает разовую с датой', () => {
    expect(dayBlockCreateSchema.safeParse(onceBlock).success).toBe(true);
  });

  it('принимает повторяемую с днём недели', () => {
    expect(dayBlockCreateSchema.safeParse(weeklyBlock).success).toBe(true);
  });

  it('принимает окно часов', () => {
    const parsed = dayBlockCreateSchema.safeParse({ ...onceBlock, fromMin: 840, toMin: 960 });

    expect(parsed.success).toBe(true);
  });

  it('разовая без даты не заводится', () => {
    expect(dayBlockCreateSchema.safeParse({ ...onceBlock, day: '' }).success).toBe(false);
  });

  it('разовая с днём недели не заводится: это уже повторяемая', () => {
    expect(dayBlockCreateSchema.safeParse({ ...onceBlock, weekday: 3 }).success).toBe(false);
  });

  it('повторяемая без дня недели не заводится', () => {
    expect(dayBlockCreateSchema.safeParse({ ...weeklyBlock, weekday: null }).success).toBe(false);
  });

  it('повторяемая с датой не заводится', () => {
    const parsed = dayBlockCreateSchema.safeParse({ ...weeklyBlock, day: '2026-08-26' });

    expect(parsed.success).toBe(false);
  });

  it('половина окна не принимается: «с 14:00» без «до» — это не окно', () => {
    expect(dayBlockCreateSchema.safeParse({ ...onceBlock, fromMin: 840 }).success).toBe(false);
    expect(dayBlockCreateSchema.safeParse({ ...onceBlock, toMin: 960 }).success).toBe(false);
  });

  it('конец окна раньше начала не принимается', () => {
    const parsed = dayBlockCreateSchema.safeParse({ ...onceBlock, fromMin: 960, toMin: 840 });

    expect(parsed.success).toBe(false);
    expect(parsed.success ? '' : parsed.error.issues[0]?.path.join('.')).toBe('toMin');
  });

  it('пустое окно нулевой длины не принимается', () => {
    const parsed = dayBlockCreateSchema.safeParse({ ...onceBlock, fromMin: 840, toMin: 840 });

    expect(parsed.success).toBe(false);
  });

  it('несуществующая дата не принимается', () => {
    expect(dayBlockCreateSchema.safeParse({ ...onceBlock, day: '2026-02-30' }).success).toBe(false);
  });

  it('день недели вне 1…7 не принимается', () => {
    expect(dayBlockCreateSchema.safeParse({ ...weeklyBlock, weekday: 0 }).success).toBe(false);
    expect(dayBlockCreateSchema.safeParse({ ...weeklyBlock, weekday: 8 }).success).toBe(false);
  });

  it('пустая причина становится «не заполнено», а не пустой строкой', () => {
    const parsed = dayBlockCreateSchema.safeParse({ ...onceBlock, reason: '   ' });

    expect(parsed.success ? parsed.data.reason : 'не разобрано').toBeNull();
  });

  it('вид повтора из формы проверяется, а не берётся на веру', () => {
    expect(isDayBlockRepeat('weekly')).toBe(true);
    expect(isDayBlockRepeat('каждую среду')).toBe(false);
  });
});
