import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { resolveChannels } from './channels';
import type { NotificationPayload } from './types';

/**
 * Постановка уведомления в очередь.
 *
 * 🔴 Инвариант 2 (docs/CLAUDE.md): обращение и уведомление о нём пишутся одной
 * транзакцией (ADR-091) — маршрут передаёт сюда транзакционный клиент, и сбой
 * записи очереди откатывает обращение целиком. Клиент получает честную ошибку
 * с телефоном как запасным путём — это лучше молча потерянного уведомления,
 * о котором владелец не узнал бы никогда. Ответ `201` по-прежнему не ждёт ни
 * Telegram, ни SMTP: каналы трогает только воркер.
 *
 * Оба канала выключены владельцем — уведомление некуда ставить: обращение
 * сохраняется без записей очереди, это осознанный выбор из админки.
 */
export async function enqueueNotification(
  payload: NotificationPayload,
  client: Prisma.TransactionClient = db,
  channels?: readonly string[],
): Promise<number> {
  // список каналов приходит из настроек владельца; в тестах его задают явно
  const targets = channels ?? (await resolveChannels()).enabled;

  if (targets.length === 0) {
    console.error(
      `Уведомление «${payload.kind}» некуда отправить: ни один канал не настроен. Обращение сохранено в базе.`,
    );
    return 0;
  }

  const created = await client.notification.createMany({
    data: targets.map((channel) => ({ channel, kind: payload.kind, payload })),
  });
  return created.count;
}
