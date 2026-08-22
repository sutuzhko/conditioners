import { db } from '@/server/db';
import { resolveChannels } from './channels';
import { notificationPayloadSchema } from './types';
import type { ChannelRegistry } from './types';

/**
 * Разбор очереди уведомлений: одна попытка доставки на каждую созревшую запись.
 *
 * Повторы — экспоненциальные (docs/TECH_DECISIONS.md §5). Смысл в том, что
 * недоступность Telegram или SMTP обычно длится минуты: первые попытки идут
 * часто, дальше пауза растёт, чтобы не молотить в закрытую дверь.
 */
export const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;
const DEFAULT_BATCH_SIZE = 20;

/** Задержка перед попыткой номер `attempts`: 30 с, 1, 2, 4, 8, 16 минут — но не больше получаса. */
export function nextDelayMs(attempts: number): number {
  if (attempts < 1) return BASE_DELAY_MS;
  return Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), MAX_DELAY_MS);
}

export type TickResult = {
  readonly sent: number;
  readonly retried: number;
  readonly failed: number;
};

export type TickOptions = {
  readonly channels?: ChannelRegistry;
  readonly now?: Date;
  readonly batchSize?: number;
};

function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  // `lastError` показывается в админке — длинную простыню туда класть незачем
  return text.slice(0, 500);
}

export async function processDueNotifications(options: TickOptions = {}): Promise<TickResult> {
  // реестр строится по настройкам владельца: канал, который он выключил,
  // не должен доставлять даже то, что уже лежит в очереди
  const channels = options.channels ?? (await resolveChannels()).registry;
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const due = await db.notification.findMany({
    where: { status: 'PENDING', nextTryAt: { lte: now } },
    orderBy: { nextTryAt: 'asc' },
    take: batchSize,
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const notification of due) {
    const attempts = notification.attempts + 1;

    // Захват попытки: пока идёт отправка, запись уже отодвинута на следующий срок.
    // Так второй воркер (или следующий тик) не возьмёт её повторно, а зависшая
    // отправка не заблокирует очередь навсегда.
    const claimed = await db.notification.updateMany({
      where: { id: notification.id, status: 'PENDING', attempts: notification.attempts },
      data: { attempts, nextTryAt: new Date(now.getTime() + nextDelayMs(attempts)) },
    });
    if (claimed.count === 0) continue;

    try {
      const channel = channels[notification.channel];
      if (channel === undefined) {
        throw new Error(`Неизвестный канал доставки «${notification.channel}»`);
      }
      if (!channel.isEnabled()) {
        throw new Error(`Канал «${notification.channel}» выключен в настройках окружения`);
      }

      await channel.send(notificationPayloadSchema.parse(notification.payload));

      await db.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (error) {
      const lastError = errorText(error);
      if (attempts >= MAX_ATTEMPTS) {
        await db.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED', lastError },
        });
        failed += 1;
        console.error(
          `Уведомление ${notification.id} (${notification.channel}/${notification.kind}) не доставлено после ${attempts} попыток: ${lastError}`,
        );
      } else {
        await db.notification.update({
          where: { id: notification.id },
          data: { lastError },
        });
        retried += 1;
      }
    }
  }

  return { sent, retried, failed };
}
