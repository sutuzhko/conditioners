import { db } from '@/server/db';
import { enabledChannelNames } from './channels';
import type { NotificationPayload } from './types';

/**
 * Постановка уведомления в очередь.
 *
 * 🔴 Инвариант 2 (docs/CLAUDE.md): обращение уже лежит в базе, когда сюда
 * приходит управление. Поэтому функция никогда не бросает — сбой очереди не
 * должен превращаться в ошибку для клиента, который свою часть уже выполнил.
 */
export async function enqueueNotification(
  payload: NotificationPayload,
  channels: readonly string[] = enabledChannelNames(),
): Promise<number> {
  if (channels.length === 0) {
    console.error(
      `Уведомление «${payload.kind}» некуда отправить: ни один канал не настроен. Обращение сохранено в базе.`,
    );
    return 0;
  }

  try {
    const created = await db.notification.createMany({
      data: channels.map((channel) => ({ channel, kind: payload.kind, payload })),
    });
    return created.count;
  } catch (error) {
    console.error(`Не удалось поставить уведомление «${payload.kind}» в очередь`, error);
    return 0;
  }
}
