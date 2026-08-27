import { describe, expect, it } from 'vitest';

import { momentOf } from '@/shared/lib/calendar';

import { overtimeMinutes, type WorkWindow } from './overtime';

/** Рабочее окно по умолчанию: с девяти до семи. */
const WINDOW: WorkWindow = { fromMin: 9 * 60, toMin: 19 * 60 };

describe('переработка', () => {
  it('работа внутри окна переработки не даёт', () => {
    expect(overtimeMinutes(momentOf('2026-08-27', '10:00'), 180, WINDOW)).toBe(0);
  });

  it('считает хвост после конца рабочего дня', () => {
    /* с 18:00 три часа: до 19:00 внутри окна, два часа сверх */
    expect(overtimeMinutes(momentOf('2026-08-27', '18:00'), 180, WINDOW)).toBe(120);
  });

  it('считает начало раньше открытия окна', () => {
    expect(overtimeMinutes(momentOf('2026-08-27', '07:30'), 120, WINDOW)).toBe(90);
  });

  it('работа целиком вне окна — переработка целиком', () => {
    expect(overtimeMinutes(momentOf('2026-08-27', '21:00'), 60, WINDOW)).toBe(60);
  });

  it('🔴 работа за полночь считается по окну следующего дня, а не целиком', () => {
    /* с 22:00 восемь часов: до полуночи 2 часа сверх, ночью до 9 утра ещё
       9 часов сверх, с 9:00 до 6:00 работы уже нет — итого 480 минут вне
       окна из восьми часов, но проверяем именно расчёт по двум суткам */
    expect(overtimeMinutes(momentOf('2026-08-27', '22:00'), 8 * 60, WINDOW)).toBe(8 * 60);
    /* а вот работа с 22:00 до 11:00 следующего дня даёт два часа внутри окна */
    expect(overtimeMinutes(momentOf('2026-08-27', '22:00'), 13 * 60, WINDOW)).toBe(11 * 60);
  });

  it('нулевая и отрицательная длительность переработки не дают', () => {
    expect(overtimeMinutes(momentOf('2026-08-27', '21:00'), 0, WINDOW)).toBe(0);
    expect(overtimeMinutes(momentOf('2026-08-27', '21:00'), -60, WINDOW)).toBe(0);
  });

  it('круглосуточное окно переработки не даёт вовсе', () => {
    const around: WorkWindow = { fromMin: 0, toMin: 24 * 60 };
    expect(overtimeMinutes(momentOf('2026-08-27', '03:00'), 240, around)).toBe(0);
  });
});
