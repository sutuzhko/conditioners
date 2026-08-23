import { describe, expect, it } from 'vitest';

import { crmEventCreateSchema, crmEventUpdateSchema, isCrmEventKind } from './model';

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
