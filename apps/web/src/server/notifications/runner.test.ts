// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelRegistry, NotificationPayload } from './types';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    notification: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));

const { MAX_ATTEMPTS, nextDelayMs, processDueNotifications } = await import('./runner');

const NOW = new Date('2026-08-20T12:00:00.000Z');

const LEAD_PAYLOAD: NotificationPayload = {
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

function queued(overrides: Partial<{ id: string; channel: string; attempts: number }> = {}) {
  return {
    id: overrides.id ?? 'n1',
    channel: overrides.channel ?? 'email',
    kind: 'lead',
    payload: LEAD_PAYLOAD,
    status: 'PENDING',
    attempts: overrides.attempts ?? 0,
    lastError: null,
    nextTryAt: NOW,
    createdAt: NOW,
    sentAt: null,
    // уведомление владельцу: получателя нет, адрес общий из настроек
    recipientId: null,
    address: null,
  };
}

function registry(send: () => Promise<void>, enabled = true): ChannelRegistry {
  return { email: { name: 'email', isEnabled: () => enabled, send } };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.notification.updateMany.mockResolvedValue({ count: 1 });
  dbMock.notification.update.mockResolvedValue({});
});

describe('расчёт задержки повтора', () => {
  it('растёт вдвое с каждой попыткой', () => {
    expect(nextDelayMs(1)).toBe(30_000);
    expect(nextDelayMs(2)).toBe(60_000);
    expect(nextDelayMs(3)).toBe(120_000);
    expect(nextDelayMs(4)).toBe(240_000);
  });

  it('упирается в потолок в полчаса', () => {
    expect(nextDelayMs(10)).toBe(1_800_000);
    expect(nextDelayMs(100)).toBe(1_800_000);
  });
});

describe('разбор очереди', () => {
  it('отправляет созревшее уведомление и помечает его доставленным', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued()]);
    const send = vi.fn().mockResolvedValue(undefined);

    const result = await processDueNotifications({ channels: registry(send), now: NOW });

    // адрес не передаётся: у владельца он общий и канал берёт его сам
    expect(send).toHaveBeenCalledWith(LEAD_PAYLOAD, undefined);
    expect(result).toEqual({ sent: 1, retried: 0, failed: 0 });
    expect(dbMock.notification.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'n1' },
      data: { status: 'SENT', lastError: null },
    });
  });

  it('берёт только созревшие записи в статусе PENDING', async () => {
    dbMock.notification.findMany.mockResolvedValue([]);

    await processDueNotifications({ channels: registry(vi.fn()), now: NOW, batchSize: 7 });

    expect(dbMock.notification.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING', nextTryAt: { lte: NOW } },
      orderBy: { nextTryAt: 'asc' },
      take: 7,
    });
  });

  it('перед отправкой захватывает попытку и отодвигает следующий срок', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ attempts: 2 })]);

    await processDueNotifications({ channels: registry(vi.fn()), now: NOW });

    expect(dbMock.notification.updateMany.mock.calls[0]?.[0]).toEqual({
      where: { id: 'n1', status: 'PENDING', attempts: 2 },
      data: { attempts: 3, nextTryAt: new Date(NOW.getTime() + 120_000) },
    });
  });

  it('не отправляет запись, которую успел забрать другой воркер', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued()]);
    dbMock.notification.updateMany.mockResolvedValue({ count: 0 });
    const send = vi.fn();

    const result = await processDueNotifications({ channels: registry(send), now: NOW });

    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, retried: 0, failed: 0 });
  });

  it('после сбоя оставляет запись в очереди и запоминает причину', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ attempts: 1 })]);
    const send = vi.fn().mockRejectedValue(new Error('Telegram недоступен: fetch failed'));

    const result = await processDueNotifications({ channels: registry(send), now: NOW });

    expect(result).toEqual({ sent: 0, retried: 1, failed: 0 });
    expect(dbMock.notification.update.mock.calls[0]?.[0]).toEqual({
      where: { id: 'n1' },
      data: { lastError: 'Telegram недоступен: fetch failed' },
    });
  });

  it('после исчерпания попыток переводит уведомление в FAILED', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ attempts: MAX_ATTEMPTS - 1 })]);
    const send = vi.fn().mockRejectedValue(new Error('SMTP не отвечает'));

    const result = await processDueNotifications({ channels: registry(send), now: NOW });

    expect(result).toEqual({ sent: 0, retried: 0, failed: 1 });
    expect(dbMock.notification.update.mock.calls[0]?.[0]).toEqual({
      where: { id: 'n1' },
      data: { status: 'FAILED', lastError: 'SMTP не отвечает' },
    });
  });

  it('обрезает слишком длинную ошибку: её показывают в админке', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ attempts: MAX_ATTEMPTS - 1 })]);
    const send = vi.fn().mockRejectedValue(new Error('я'.repeat(900)));

    await processDueNotifications({ channels: registry(send), now: NOW });

    const stored: unknown = dbMock.notification.update.mock.calls[0]?.[0].data.lastError;
    expect(String(stored)).toHaveLength(500);
  });

  it('выключенный канал не молчит, а объясняет причину в lastError', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ attempts: MAX_ATTEMPTS - 1 })]);
    const send = vi.fn();

    await processDueNotifications({ channels: registry(send, false), now: NOW });

    expect(send).not.toHaveBeenCalled();
    expect(String(dbMock.notification.update.mock.calls[0]?.[0].data.lastError)).toContain(
      'выключен',
    );
  });

  it('неизвестный канал не роняет разбор очереди', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ channel: 'sms' })]);

    const result = await processDueNotifications({ channels: registry(vi.fn()), now: NOW });

    expect(result).toEqual({ sent: 0, retried: 1, failed: 0 });
    expect(String(dbMock.notification.update.mock.calls[0]?.[0].data.lastError)).toContain(
      'Неизвестный канал',
    );
  });

  it('идёт дальше по очереди, если одно уведомление не отправилось', async () => {
    dbMock.notification.findMany.mockResolvedValue([queued({ id: 'n1' }), queued({ id: 'n2' })]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('первый упал'))
      .mockResolvedValueOnce(undefined);

    const result = await processDueNotifications({ channels: registry(send), now: NOW });

    expect(result).toEqual({ sent: 1, retried: 1, failed: 0 });
  });
});
