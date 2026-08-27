import { db } from '@/server/db';
import { deliveryTitle } from '@/server/notifications/format';
import { notificationPayloadSchema } from '@/server/notifications/types';

/**
 * Доставка уведомлений: что ушло, что ждёт очереди, что не дошло.
 *
 * 🔴 Раздел нужен ровно затем, чтобы «письмо не пришло» перестало быть
 * догадкой. Причина сбоя пишется в `Notification.lastError` воркером, но пока
 * её никто не показывает, владелец узнаёт о проблеме только по тишине.
 *
 * 🔴 С появлением адресации журнал отвечает и на второй вопрос — кому ушло.
 * Копию адресного сообщения владелец не получает (решение от 26 августа), и
 * это единственное место, где он видит переписку с монтажником.
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
  /** Кому адресовано; `null` — владельцу по общим настройкам компании. */
  readonly recipient: string | null;
  /** Адрес на момент постановки; у владельца его нет — адрес общий. */
  readonly address: string | null;
};

/** Строка журнала адресных сообщений: что и кому ушло, дошло ли. */
export type DeliveryEntry = DeliveryFailure & {
  /** Событие человеческими словами: «Вам назначен наряд № 1059». */
  readonly title: string;
  readonly sentAt: string | null;
};

const FROM_DB = { PENDING: 'pending', SENT: 'sent', FAILED: 'failed' } as const;

const withRecipient = { recipient: { select: { name: true, login: true } } } as const;

type NotificationRow = {
  id: string;
  channel: string;
  kind: string;
  payload: unknown;
  attempts: number;
  lastError: string | null;
  status: keyof typeof FROM_DB;
  createdAt: Date;
  nextTryAt: Date;
  sentAt: Date | null;
  address: string | null;
  recipient: { name: string | null; login: string } | null;
};

function toFailure(row: NotificationRow): DeliveryFailure {
  return {
    id: row.id,
    channel: row.channel,
    kind: row.kind,
    attempts: row.attempts,
    lastError: row.lastError,
    status: FROM_DB[row.status],
    createdAt: row.createdAt.toISOString(),
    nextTryAt: row.nextTryAt.toISOString(),
    recipient: row.recipient === null ? null : (row.recipient.name ?? row.recipient.login),
    address: row.address,
  };
}

/**
 * Заголовок события собирается из снимка, а не из `kind`: владелец должен
 * видеть, какой именно наряд ушёл человеку. Снимок старого формата (запись
 * пережила выкладку) заголовка не даёт — показываем то, что есть.
 */
function toEntry(row: NotificationRow): DeliveryEntry {
  const parsed = notificationPayloadSchema.safeParse(row.payload);

  return {
    ...toFailure(row),
    title: parsed.success ? deliveryTitle(parsed.data) : row.kind,
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

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
    include: withRecipient,
  });

  return rows.map(toFailure);
}

/**
 * Что ушло людям: последние адресные уведомления в любом состоянии.
 *
 * В отличие от разбора сбоев здесь видны и удачные доставки — иначе владелец
 * не знает, дошёл ли до монтажника наряд, а копии сообщения он не получает.
 */
export async function recentPersonal(limit = 20): Promise<readonly DeliveryEntry[]> {
  const rows = await db.notification.findMany({
    where: { recipientId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: withRecipient,
  });

  return rows.map(toEntry);
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

/**
 * Чистка доставленных уведомлений. В payload лежат имя, телефон и адрес
 * клиента — снимку ПДн незачем жить дольше, чем нужно журналу доставки
 * (152-ФЗ; аудит, BUGS). Отказы не трогаем: их разбирает владелец, и до
 * разбора они должны быть видны.
 */
export async function dropSentOlderThan(before: Date): Promise<number> {
  const removed = await db.notification.deleteMany({
    where: { status: 'SENT', sentAt: { lt: before } },
  });
  return removed.count;
}
