// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationPayload } from './types';

const { dbMock, channelsMock, usersMock } = vi.hoisted(() => ({
  dbMock: { notification: { createMany: vi.fn(), create: vi.fn() } },
  channelsMock: { resolveChannels: vi.fn() },
  usersMock: { findDeliveryTarget: vi.fn() },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('./channels', () => channelsMock);
vi.mock('@/server/repo/admin-users', () => usersMock);

const { enqueueNotification } = await import('./queue');

const LEAD: NotificationPayload = {
  kind: 'lead',
  leadId: 'lead-1',
  name: 'Игорь',
  phone: '+79001234567',
  topic: 'Монтаж и установка',
  place: null,
  qty: null,
  callTime: null,
  address: null,
  comment: null,
  photo: null,
  sourceUrl: null,
};

const ASSIGNED: NotificationPayload = {
  kind: 'order-assigned',
  orderId: 'o-1',
  number: 1059,
  type: 'install',
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12',
  intercom: null,
  phone2: null,
  floor: null,
  heightWorks: false,
  clientName: 'Ирина Соколова',
  clientPhone: '+79101552468',
  payment: 'company',
  installerFee: 9000,
  comment: null,
  units: [],
};

/** Каналы включены владельцем; адрес получателя проверяет сама очередь. */
function channels(enabled: readonly string[] = ['telegram', 'email']) {
  const make = (name: string) => ({
    name,
    isEnabled: () => enabled.includes(name),
    send: vi.fn(),
  });

  return { registry: { telegram: make('telegram'), email: make('email') }, enabled };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.notification.createMany.mockResolvedValue({ count: 2 });
  dbMock.notification.create.mockResolvedValue({ id: 'n-1' });
  channelsMock.resolveChannels.mockResolvedValue(channels());
});

describe('Уведомление владельцу', () => {
  it('🔴 ставится как раньше: без получателя и без адреса', async () => {
    await enqueueNotification(LEAD);

    expect(dbMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        { channel: 'telegram', kind: 'lead', payload: LEAD },
        { channel: 'email', kind: 'lead', payload: LEAD },
      ],
    });
    expect(usersMock.findDeliveryTarget).not.toHaveBeenCalled();
  });

  it('ни одного канала — обращение остаётся в базе без записей очереди', async () => {
    channelsMock.resolveChannels.mockResolvedValue(channels([]));

    expect(await enqueueNotification(LEAD)).toBe(0);
    expect(dbMock.notification.createMany).not.toHaveBeenCalled();
  });
});

describe('Адресное уведомление', () => {
  it('🔴 без получателя не ставится молча, а падает: это ошибка вызывающего', async () => {
    await expect(enqueueNotification(ASSIGNED)).rejects.toThrow(/получатель не передан/);
  });

  it('🔴 адрес пишется снимком: человек меняет чат, журнал помнит прежний', async () => {
    usersMock.findDeliveryTarget.mockResolvedValue({
      id: 'u2',
      name: 'Дмитрий Соколов',
      telegramChatId: '551234567',
      email: 'd@example.test',
    });

    await enqueueNotification(ASSIGNED, undefined, { recipientId: 'u2' });

    expect(dbMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          channel: 'telegram',
          kind: 'order-assigned',
          payload: ASSIGNED,
          recipientId: 'u2',
          address: '551234567',
        },
        {
          channel: 'email',
          kind: 'order-assigned',
          payload: ASSIGNED,
          recipientId: 'u2',
          address: 'd@example.test',
        },
      ],
    });
  });

  it('канал без адреса пропускается: почты нет — уходит только в телеграм', async () => {
    usersMock.findDeliveryTarget.mockResolvedValue({
      id: 'u2',
      name: 'Дмитрий Соколов',
      telegramChatId: '551234567',
      email: null,
    });

    await enqueueNotification(ASSIGNED, undefined, { recipientId: 'u2' });

    const call = dbMock.notification.createMany.mock.calls[0]?.[0];
    expect(call?.data.map((row: { channel: string }) => row.channel)).toEqual(['telegram']);
  });

  it('🔴 без единого адреса уведомление не теряется, а ложится в журнал отказом', async () => {
    usersMock.findDeliveryTarget.mockResolvedValue({
      id: 'u2',
      name: 'Дмитрий Соколов',
      telegramChatId: null,
      email: null,
    });

    expect(await enqueueNotification(ASSIGNED, undefined, { recipientId: 'u2' })).toBe(1);

    const call = dbMock.notification.create.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      data: { status: 'FAILED', recipientId: 'u2', channel: 'telegram' },
    });
    expect(String(call?.data.lastError)).toContain('Дмитрий Соколов');
  });

  it('учётной записи уже нет — связь не заводится, причина остаётся в журнале', async () => {
    usersMock.findDeliveryTarget.mockResolvedValue(null);

    await enqueueNotification(ASSIGNED, undefined, { recipientId: 'u-gone' });

    const call = dbMock.notification.create.mock.calls[0]?.[0];
    expect(call?.data.recipientId).toBeUndefined();
    expect(call?.data.status).toBe('FAILED');
  });
});
