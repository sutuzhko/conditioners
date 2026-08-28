// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyOrderDraft, type OrderDraft } from './model';
import { orderApi } from './lib';

/**
 * Что раздел заказов кладёт в тело запроса.
 *
 * 🔴 Отдельная проверка нужна ровно одному решению: статус наряда уходит на
 * сервер не всегда. Форма показывает сохранённый статус в `select`, и владелец
 * его не трогает, когда назначает монтажника, — присланный оттуда «Новый»
 * означал бы «оставь наряд Новым с исполнителем», то есть ровно то состояние,
 * из которого наряд сам не выходит.
 */
const fetchMock = vi.fn();

function draftWith(patch: Partial<OrderDraft>): OrderDraft {
  return { ...emptyOrderDraft('2026-08-28'), clientId: 'c1', address: 'Тула', ...patch };
}

/** Тело последнего запроса, как его увидит сервер. */
function sentBody(): Record<string, unknown> {
  const init: RequestInit | undefined = fetchMock.mock.calls[0]?.[1];
  const body = init?.body;
  if (typeof body !== 'string') throw new Error('Запрос ушёл без тела');

  const parsed: unknown = JSON.parse(body);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Тело запроса — не объект');

  return { ...parsed };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
});

describe('правка наряда', () => {
  it('согласованный статус уходит вместе с остальными полями', async () => {
    await orderApi.update('o1', draftWith({ status: 'assigned', installerId: 'u2' }));

    expect(sentBody().status).toBe('assigned');
    expect(sentBody().installerId).toBe('u2');
  });

  it('🔴 «Новый» с назначенным монтажником не отправляется: статус выведет сервер', async () => {
    await orderApi.update('o1', draftWith({ status: 'new', installerId: 'u2' }));

    const body = sentBody();
    expect('status' in body).toBe(false);
    expect(body.installerId).toBe('u2');
  });

  it('🔴 снятый исполнитель у «Назначенного» — тот же случай', async () => {
    await orderApi.update('o1', draftWith({ status: 'assigned', installerId: '' }));

    expect('status' in sentBody()).toBe(false);
  });

  it('наряд без исполнителя остаётся «Новым» и статус присылает', async () => {
    await orderApi.update('o1', draftWith({ status: 'new', installerId: '' }));

    expect(sentBody().status).toBe('new');
  });

  it('закрытый наряд без исполнителя статус присылает: пара не ограничена', async () => {
    await orderApi.update('o1', draftWith({ status: 'done', installerId: '' }));

    expect(sentBody().status).toBe('done');
  });
});

describe('заведение наряда', () => {
  it('🔴 статус не отправляется вовсе: его назначает сервер по исполнителю', async () => {
    await orderApi.create(draftWith({ status: 'assigned', installerId: 'u2' }));

    expect('status' in sentBody()).toBe(false);
  });
});
