// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  orderCreateSchema,
  orderInstallerUpdateSchema,
  orderPairIssue,
  orderResultSchema,
  orderUpdateSchema,
} from './model';

/**
 * Схемы наряда — контракт docs/API.md §13.
 *
 * 🔴 Здесь проверяется то, что стоит денег и людей: связка статуса с
 * исполнителем (наряд, повисший во вкладке «Новые» с уже уведомлённым
 * монтажником), удержание без основания и телефон, который в панели работает
 * кнопкой «позвонить».
 */

const CREATE = {
  type: 'install',
  clientId: 'c1',
  day: '2026-08-28',
  time: '11:00',
  address: 'Тула, Ленина, 1',
};

describe('заведение наряда', () => {
  it('принимает минимум полей и проставляет остальное умолчаниями', () => {
    const parsed = orderCreateSchema.parse(CREATE);

    expect(parsed.installerId).toBeNull();
    expect(parsed.durationMin).toBe(120);
    expect(parsed.payment).toBe('company');
    expect(parsed.price).toBe(0);
    expect(parsed.units).toEqual([]);
  });

  it('статус из тела не принимается: его выставляет сервер по исполнителю', () => {
    const parsed = orderCreateSchema.parse({ ...CREATE, status: 'done' });

    expect('status' in parsed).toBe(false);
  });

  it('несуществующая дата отвергается, а не превращается в соседнюю', () => {
    expect(orderCreateSchema.safeParse({ ...CREATE, day: '2026-02-30' }).success).toBe(false);
  });

  it('время принимается только круглосуточным форматом', () => {
    expect(orderCreateSchema.safeParse({ ...CREATE, time: '24:00' }).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...CREATE, time: '9:00' }).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...CREATE, time: '23:59' }).success).toBe(true);
  });

  it('🔴 удержание без основания не записывается', () => {
    const parsed = orderCreateSchema.safeParse({ ...CREATE, deductionSum: 1000 });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['deductionReason']);
  });

  it('удержание с основанием проходит', () => {
    const parsed = orderCreateSchema.safeParse({
      ...CREATE,
      deductionSum: 1000,
      deductionReason: 'Разбитый блок',
    });

    expect(parsed.success).toBe(true);
  });

  it('длительность: четверть часа снизу и сутки сверху', () => {
    expect(orderCreateSchema.safeParse({ ...CREATE, durationMin: 14 }).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...CREATE, durationMin: 15 }).success).toBe(true);
    expect(orderCreateSchema.safeParse({ ...CREATE, durationMin: 1441 }).success).toBe(false);
  });

  it('позиций не больше двадцати', () => {
    const unit = { equip: 'conditioner', source: 'ours' };

    expect(
      orderCreateSchema.safeParse({ ...CREATE, units: Array.from({ length: 20 }, () => unit) })
        .success,
    ).toBe(true);
    expect(
      orderCreateSchema.safeParse({ ...CREATE, units: Array.from({ length: 21 }, () => unit) })
        .success,
    ).toBe(false);
  });
});

describe('второй номер объекта', () => {
  it('пустое поле — это «не заполнено», а не пустая строка', () => {
    expect(orderCreateSchema.parse({ ...CREATE, phone2: '' }).phone2).toBeNull();
  });

  it('номер в любом привычном виде проходит', () => {
    expect(orderCreateSchema.parse({ ...CREATE, phone2: '8 (910) 155-24-68' }).phone2).toBe(
      '8 (910) 155-24-68',
    );
  });

  it('🔴 мусор не проходит: в наряде номер — это кнопка «позвонить»', () => {
    expect(orderCreateSchema.safeParse({ ...CREATE, phone2: 'asdf' }).success).toBe(false);
    expect(orderCreateSchema.safeParse({ ...CREATE, phone2: '123' }).success).toBe(false);
  });
});

describe('правка наряда', () => {
  it('пустое тело отвергается: сохранять нечего', () => {
    expect(orderUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('поля, которые выставляет сервер, в тело не принимаются', () => {
    expect(orderUpdateSchema.safeParse({ number: 12 }).success).toBe(false);
    expect(orderUpdateSchema.safeParse({ overtimeMin: 60 }).success).toBe(false);
    expect(orderUpdateSchema.safeParse({ createdAt: '2026-08-28' }).success).toBe(false);
  });

  it('дата и время переносятся только вместе', () => {
    expect(orderUpdateSchema.safeParse({ day: '2026-09-01' }).success).toBe(false);
    expect(orderUpdateSchema.safeParse({ time: '12:00' }).success).toBe(false);
    expect(orderUpdateSchema.safeParse({ day: '2026-09-01', time: '12:00' }).success).toBe(true);
  });

  it('правка одного адреса основания удержания не требует', () => {
    expect(orderUpdateSchema.safeParse({ address: 'Тула, Мира, 4' }).success).toBe(true);
  });

  it('сумму удержания без основания не сохранить', () => {
    expect(orderUpdateSchema.safeParse({ deductionSum: 500 }).success).toBe(false);
  });
});

describe('🔴 статус и исполнитель — одна пара', () => {
  it('«Новый» с назначенным исполнителем не сохраняется', () => {
    const parsed = orderUpdateSchema.safeParse({ status: 'new', installerId: 'u2' });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['status']);
  });

  it('«Назначен» и «В работе» без исполнителя не сохраняются', () => {
    for (const status of ['assigned', 'in_progress'] as const) {
      const parsed = orderUpdateSchema.safeParse({ status, installerId: '' });

      expect(parsed.success).toBe(false);
      expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['installerId']);
    }
  });

  it('назначение без статуса проходит: статус выведет сервер за исполнителем', () => {
    expect(orderUpdateSchema.safeParse({ installerId: 'u2' }).success).toBe(true);
    expect(orderUpdateSchema.safeParse({ installerId: '' }).success).toBe(true);
  });

  it('закрытый и отменённый наряд парой не связаны: работу мог закрыть владелец', () => {
    expect(orderUpdateSchema.safeParse({ status: 'done', installerId: '' }).success).toBe(true);
    expect(orderUpdateSchema.safeParse({ status: 'cancelled', installerId: '' }).success).toBe(
      true,
    );
    expect(orderUpdateSchema.safeParse({ status: 'done', installerId: 'u2' }).success).toBe(true);
  });

  it('согласованная пара проходит', () => {
    expect(orderUpdateSchema.safeParse({ status: 'assigned', installerId: 'u2' }).success).toBe(
      true,
    );
    expect(orderUpdateSchema.safeParse({ status: 'new', installerId: '' }).success).toBe(true);
  });

  it('правило одно и то же для схемы, репозитория и формы', () => {
    expect(orderPairIssue('new', true)?.field).toBe('status');
    expect(orderPairIssue('assigned', false)?.field).toBe('installerId');
    expect(orderPairIssue('in_progress', false)?.field).toBe('installerId');

    expect(orderPairIssue('new', false)).toBeNull();
    expect(orderPairIssue('assigned', true)).toBeNull();
    expect(orderPairIssue('in_progress', true)).toBeNull();
    expect(orderPairIssue('done', false)).toBeNull();
    expect(orderPairIssue('done', true)).toBeNull();
    expect(orderPairIssue('cancelled', false)).toBeNull();
    expect(orderPairIssue('cancelled', true)).toBeNull();
  });
});

describe('правка наряда монтажником', () => {
  it('доступны ровно два перехода', () => {
    expect(orderInstallerUpdateSchema.safeParse({ status: 'in_progress' }).success).toBe(true);
    expect(orderInstallerUpdateSchema.safeParse({ status: 'done' }).success).toBe(true);
  });

  it('🔴 отказ, назначение и возврат в работу монтажнику недоступны', () => {
    for (const status of ['new', 'assigned', 'cancelled']) {
      expect(orderInstallerUpdateSchema.safeParse({ status }).success).toBe(false);
    }
  });

  it('ничего, кроме статуса, из тела не берётся', () => {
    expect(orderInstallerUpdateSchema.safeParse({ status: 'done', price: 100_000 }).success).toBe(
      false,
    );
  });
});

describe('итог работ', () => {
  it('пустые поля означают «не заполняли»', () => {
    expect(orderResultSchema.parse({ extraWork: '', report: '' })).toEqual({
      extraWork: null,
      report: null,
    });
  });

  it('🔴 плановую сумму итог не правит: денежных полей в нём нет', () => {
    expect(orderResultSchema.safeParse({ report: 'Готово', price: 9000 }).success).toBe(false);
  });
});
