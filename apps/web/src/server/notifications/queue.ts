import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { findDeliveryTarget } from '@/server/repo/admin-users';
import { resolveChannels } from './channels';
import {
  addressFor,
  audienceOf,
  hasAnyAddress,
  NO_ADDRESSES,
  preferredChannel,
  toDeliveryAddresses,
  type DeliveryAddresses,
} from './recipients';
import type { ChannelRegistry, NotificationPayload } from './types';

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
 *
 * Кому уходит сообщение, решает таблица «роль × вид события» (`recipients.ts`),
 * а не вызывающий: заявка, отзыв и напоминание о ТО — владельцу по общим
 * настройкам, всё про наряд — тому, кому наряд назначен.
 */
export type EnqueueOptions = {
  /**
   * Кому адресовано. Обязателен для событий наряда и запрещён для остальных:
   * подставить получателя заявке значило бы обойти таблицу адресации.
   */
  readonly recipientId?: string;
  /** Каналы явным списком — только для тестов. */
  readonly channels?: readonly string[];
};

/** Причина, по которой адресное уведомление не поставлено в очередь. */
function refusal(name: string, addresses: DeliveryAddresses, enabled: readonly string[]): string {
  if (!hasAnyAddress(addresses)) {
    return (
      `${name}: не задан адрес доставки. Телеграм привязывается командой боту, ` +
      'почта заполняется в карточке человека.'
    );
  }

  const has = addresses.telegram === null ? 'почта' : 'телеграм';
  return (
    `${name}: адрес есть только там, где канал не работает (${has}). ` +
    `Работают каналы: ${enabled.join(', ')}.`
  );
}

/** Каналы, в которых у человека есть адрес и которые сейчас работают. */
function personalChannels(
  registry: ChannelRegistry,
  addresses: DeliveryAddresses,
): readonly { readonly channel: string; readonly address: string }[] {
  return Object.entries(registry).flatMap(([channel, implementation]) => {
    const address = addressFor(channel, addresses);
    if (implementation === undefined || address === null) return [];
    return implementation.isEnabled(address) ? [{ channel, address }] : [];
  });
}

export async function enqueueNotification(
  payload: NotificationPayload,
  client: Prisma.TransactionClient = db,
  options: EnqueueOptions = {},
): Promise<number> {
  // список каналов приходит из настроек владельца; в тестах его задают явно
  const { registry, enabled } = await resolveChannels();
  const targets = options.channels ?? enabled;

  if (audienceOf(payload.kind) === 'owner') {
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

  const recipientId = options.recipientId;
  if (recipientId === undefined) {
    // ошибка программиста, а не состояние данных: молча терять её нельзя
    throw new Error(`Уведомление «${payload.kind}» адресное, но получатель не передан`);
  }

  const target = await findDeliveryTarget(recipientId, client);
  const addresses = target === null ? NO_ADDRESSES : toDeliveryAddresses(target);
  const name = target?.name ?? 'Учётная запись удалена';

  /* Учётной записи уже нет — связь не заводим: внешний ключ её не примет, а
     журналу хватит имени в причине отказа. */
  const link = target === null ? {} : { recipientId };

  const personal = personalChannels(registry, addresses);

  if (personal.length > 0) {
    const created = await client.notification.createMany({
      // 🔴 `address` — снимок на момент постановки: человек меняет чат и почту,
      // а журнал обязан показывать, куда доставляли тогда
      data: personal.map(({ channel, address }) => ({
        channel,
        kind: payload.kind,
        payload,
        ...link,
        address,
      })),
    });
    return created.count;
  }

  if (targets.length === 0) {
    console.error(
      `Уведомление «${payload.kind}» некуда отправить: ни один канал не настроен. Наряд сохранён в базе.`,
    );
    return 0;
  }

  /* 🔴 Отсутствие адреса не теряется молча: запись ложится в журнал сразу
     отказом с внятной причиной, и владелец видит её в разделе «Уведомления»
     (ADR-061). Повтор после привязки чата возьмёт адрес заново — воркер
     дочитывает его у учётной записи, когда снимка нет. */
  await client.notification.create({
    data: {
      channel: preferredChannel(targets) ?? 'telegram',
      kind: payload.kind,
      payload,
      ...link,
      status: 'FAILED',
      lastError: refusal(name, addresses, targets),
    },
  });

  return 1;
}
