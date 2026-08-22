import { db } from '@/server/db';

/**
 * Доставка уведомлений: что ушло, что ждёт очереди, что не дошло.
 *
 * 🔴 Раздел нужен ровно затем, чтобы «письмо не пришло» перестало быть
 * догадкой. Причина сбоя пишется в `Notification.lastError` воркером, но пока
 * её никто не показывает, владелец узнаёт о проблеме только по тишине.
 */

export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export type DeliverySummary = {
  readonly channel: string;
  readonly pending: number;
  readonly sent: number;
  readonly failed: number;
};

export type DeliveryFailure = {
  readonly id: string;
  readonly channel: string;
  readonly kind: string;
  readonly attempts: number;
  /** Текст ошибки от канала — его же видно в логе воркера. */
  readonly lastError: string | null;
  readonly status: DeliveryStatus;
  readonly createdAt: string;
  /** Когда очередь возьмётся за неё снова; у отказов значения нет. */
  readonly nextTryAt: string;
};

const FROM_DB = { PENDING: 'pending', SENT: 'sent', FAILED: 'failed' } as const;

/** Сколько уведомлений в каждом состоянии — по каналам. */
export async function deliverySummary(): Promise<readonly DeliverySummary[]> {
  const rows = await db.notification.groupBy({
    by: ['channel', 'status'],
    _count: { _all: true },
  });

  const byChannel = new Map<string, { pending: number; sent: number; failed: number }>();

  for (const row of rows) {
    const current = byChannel.get(row.channel) ?? { pending: 0, sent: 0, failed: 0 };
    current[FROM_DB[row.status]] = row._count._all;
    byChannel.set(row.channel, current);
  }

  return [...byChannel.entries()]
    .map(([channel, counts]) => ({ channel, ...counts }))
    .sort((a, b) => a.channel.localeCompare(b.channel));
}

/**
 * Последние проблемы доставки: отказы и то, что ещё повторяется, но уже с
 * ошибкой. Успешные не показываем — в списке важен разбор, а не журнал.
 */
export async function recentFailures(limit = 20): Promise<readonly DeliveryFailure[]> {
  const rows = await db.notification.findMany({
    where: {
      OR: [{ status: 'FAILED' }, { status: 'PENDING', lastError: { not: null } }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    kind: row.kind,
    attempts: row.attempts,
    lastError: row.lastError,
    status: FROM_DB[row.status],
    createdAt: row.createdAt.toISOString(),
    nextTryAt: row.nextTryAt.toISOString(),
  }));
}

/**
 * Вернуть отказ в очередь: счётчик попыток обнуляется, срок — сейчас.
 *
 * 🔴 Нужно после починки канала: шесть попыток исчерпаны, а уведомление о
 * настоящей заявке всё ещё не доставлено. Повтор ничего не создаёт заново —
 * он отправляет тот же снимок события, который лежит в `payload`.
 */
export async function retryDelivery(id: string): Promise<boolean> {
  const updated = await db.notification.updateMany({
    where: { id, status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, nextTryAt: new Date(), lastError: null },
  });

  return updated.count > 0;
}

/** Вернуть в очередь все отказы канала — после починки доступов их обычно много. */
export async function retryFailedByChannel(channel?: string): Promise<number> {
  const updated = await db.notification.updateMany({
    where: { status: 'FAILED', ...(channel === undefined ? {} : { channel }) },
    data: { status: 'PENDING', attempts: 0, nextTryAt: new Date(), lastError: null },
  });

  return updated.count;
}
