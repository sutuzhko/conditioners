import { afterEach, describe, expect, it, vi } from 'vitest';

import { METRIKA_GOALS, YM_MASK, reachGoal } from './goals';

afterEach(() => {
  delete window.ymGoal;
});

describe('Цели Метрики (issue #678)', () => {
  it('🔴 без счётчика вызов цели ничего не делает и не падает', () => {
    expect(() => reachGoal(METRIKA_GOALS.lead)).not.toThrow();
  });

  it('со счётчиком цель уходит под своим именем', () => {
    const sent = vi.fn();
    window.ymGoal = sent;

    reachGoal(METRIKA_GOALS.lead);

    expect(sent).toHaveBeenCalledWith('lead_sent');
  });

  /* 🔴 Имена целей стоят и в коде, и в интерфейсе Метрики. Тест закрепляет
     строки: переименование здесь тихо обнулило бы отчёт в кабинете. */
  it('🔴 имена целей закреплены: их знает и код, и кабинет Метрики', () => {
    expect(METRIKA_GOALS).toEqual({
      lead: 'lead_sent',
      review: 'review_sent',
      phone: 'phone_click',
      calculator: 'calculator_used',
    });
  });

  it('метка Вебвизора запрещает и нажатия клавиш, и содержимое поля', () => {
    expect(YM_MASK).toContain('ym-disable-keys');
    expect(YM_MASK).toContain('ym-hide-content');
  });
});
