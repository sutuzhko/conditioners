// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderCard } from '@/entities/order/model';

const { queueMock } = vi.hoisted(() => ({ queueMock: { enqueueNotification: vi.fn() } }));

vi.mock('@/server/db', () => ({ db: {} }));
vi.mock('./queue', () => queueMock);

const { briefChanges, installerBrief, notifyOrderCreated, notifyOrderRemoved, notifyOrderUpdated } =
  await import('./orders');

const ORDER: OrderCard = {
  id: 'o-1',
  number: 1059,
  type: 'install',
  status: 'assigned',
  client: { id: 'c-1', name: 'Ирина Соколова', phone: '+7 (910) 155-24-68' },
  installer: { id: 'u2', name: 'Дмитрий Соколов', login: 'sokolov', employment: 'self_employed' },
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  overtimeMin: 0,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '24К',
  phone2: null,
  floor: 5,
  heightWorks: true,
  payment: 'company',
  price: 38_500,
  installerFee: 9000,
  deductionSum: 1500,
  deductionReason: 'Разбитый отлив',
  comment: 'Домофон не работает, звонить на телефон',
  ownerNote: 'Клиент постоянный, скидку не даём',
  leadId: null,
  extraWork: null,
  report: null,
  resultAt: null,
  units: [
    {
      id: 'ou-1',
      sort: 0,
      equip: 'conditioner',
      model: 'Сплит-система 09',
      source: 'ours',
      trassaM: 4,
      diameter: '1/4–3/8',
      shtrob: true,
    },
  ],
  createdAt: '2026-08-26T14:00:00.000Z',
};

function payloadOf(call: number): Record<string, unknown> {
  const args = queueMock.enqueueNotification.mock.calls[call];
  return args?.[0] ?? {};
}

function optionsOf(call: number): Record<string, unknown> {
  const args = queueMock.enqueueNotification.mock.calls[call];
  return args?.[2] ?? {};
}

beforeEach(() => {
  vi.clearAllMocks();
  queueMock.enqueueNotification.mockResolvedValue(1);
});

describe('Проекция наряда под монтажника', () => {
  it('🔴 в снимке нет ни заметки владельца, ни удержания', () => {
    const brief = installerBrief(ORDER);

    expect(brief).not.toHaveProperty('ownerNote');
    expect(brief).not.toHaveProperty('deductionSum');
    expect(brief).not.toHaveProperty('deductionReason');
  });

  it('🔴 сумма заказа при безналичной оплате не попадает в снимок вовсе', () => {
    expect(installerBrief(ORDER)).not.toHaveProperty('price');
  });

  it('🔴 при оплате наличными сумма нужна: её принимают от клиента', () => {
    const cash = installerBrief({ ...ORDER, payment: 'cash_to_installer' });

    expect(cash.price).toBe(38_500);
  });

  it('вознаграждение монтажник видит всегда: это его деньги', () => {
    expect(installerBrief(ORDER).installerFee).toBe(9000);
  });
});

describe('Что считается изменением вводных', () => {
  it('перенос, адрес, вид работ и состав оборудования — изменение', () => {
    const moved = briefChanges(
      installerBrief(ORDER),
      installerBrief({
        ...ORDER,
        at: '2026-08-29T08:00:00.000Z',
        address: 'Тула, Ленина, 1',
        type: 'repair',
        units: [],
      }),
    );

    expect(moved).toEqual(['type', 'at', 'address', 'units']);
  });

  it('🔴 правка заметки владельца вводными не является: монтажник её не видит', () => {
    const changed = briefChanges(
      installerBrief(ORDER),
      installerBrief({ ...ORDER, ownerNote: 'другое', deductionSum: 9000 }),
    );

    expect(changed).toEqual([]);
  });

  it('🔴 отчёт о выезде вводными не является: его заполняет сам монтажник', () => {
    const changed = briefChanges(
      installerBrief(ORDER),
      installerBrief({
        ...ORDER,
        extraWork: 'Добавили метр трассы',
        report: 'Готово',
        resultAt: '2026-08-28T12:00:00.000Z',
      }),
    );

    expect(changed).toEqual([]);
  });

  it('смена клиента — изменение: ехать к другому человеку', () => {
    const changed = briefChanges(
      installerBrief(ORDER),
      installerBrief({ ...ORDER, client: { id: 'c-2', name: 'Пётр', phone: '+79000000000' } }),
    );

    expect(changed).toEqual(['client']);
  });
});

describe('Постановка уведомлений о наряде', () => {
  it('наряд заведён с исполнителем — он узнаёт об этом сразу', async () => {
    await notifyOrderCreated(ORDER);

    expect(payloadOf(0).kind).toBe('order-assigned');
    expect(optionsOf(0)).toEqual({ recipientId: 'u2' });
  });

  it('исполнителя ещё нет — писать некому', async () => {
    expect(await notifyOrderCreated({ ...ORDER, installer: null, status: 'new' })).toBe(0);
    expect(queueMock.enqueueNotification).not.toHaveBeenCalled();
  });

  it('🔴 переназначение — это два события: отмена прежнему и назначение новому', async () => {
    const after: OrderCard = {
      ...ORDER,
      installer: { id: 'u3', name: 'Пётр', login: 'petrov', employment: null },
    };

    await notifyOrderUpdated(ORDER, after);

    expect(payloadOf(0)).toMatchObject({ kind: 'order-cancelled', reason: 'reassigned' });
    expect(optionsOf(0)).toEqual({ recipientId: 'u2' });
    expect(payloadOf(1).kind).toBe('order-assigned');
    expect(optionsOf(1)).toEqual({ recipientId: 'u3' });
  });

  it('исполнителя сняли и не назначили — так и пишем, без выдумки про коллегу', async () => {
    await notifyOrderUpdated(ORDER, { ...ORDER, installer: null, status: 'new' });

    expect(payloadOf(0)).toMatchObject({ kind: 'order-cancelled', reason: 'unassigned' });
  });

  it('отказ по наряду доходит до того, кто на него ехал', async () => {
    await notifyOrderUpdated(ORDER, { ...ORDER, status: 'cancelled' });

    expect(payloadOf(0)).toMatchObject({ kind: 'order-cancelled', reason: 'cancelled' });
    expect(optionsOf(0)).toEqual({ recipientId: 'u2' });
  });

  it('правка вводных уходит списком того, что поменялось', async () => {
    await notifyOrderUpdated(ORDER, { ...ORDER, at: '2026-08-29T08:00:00.000Z' });

    expect(payloadOf(0)).toMatchObject({ kind: 'order-changed', changes: ['at'] });
  });

  it('🔴 правка закрытых полей монтажника не беспокоит', async () => {
    expect(await notifyOrderUpdated(ORDER, { ...ORDER, ownerNote: 'иное' })).toBe(0);
    expect(queueMock.enqueueNotification).not.toHaveBeenCalled();
  });

  it('возврат наряда в работу — назначение заново', async () => {
    await notifyOrderUpdated({ ...ORDER, status: 'cancelled' }, ORDER);

    expect(payloadOf(0).kind).toBe('order-assigned');
  });

  it('удаление наряда для монтажника — отмена', async () => {
    await notifyOrderRemoved(ORDER);

    expect(payloadOf(0)).toMatchObject({ kind: 'order-cancelled', reason: 'cancelled' });
  });
});
