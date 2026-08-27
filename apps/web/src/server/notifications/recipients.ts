import type { ChannelName, NotificationKind } from './types';

/**
 * 🔴 Таблица «роль × вид события» — единственное место, где решается, кому
 * уходит сообщение.
 *
 * Решение владельца от 26 августа: жёсткое соответствие, а не настройка по
 * каждому человеку. Настраивать здесь нечего — значит, и ломаться нечему:
 * заявка, отзыв и напоминание о ТО всегда владельцу, всё про наряд — тому,
 * кому наряд назначен.
 *
 * Условия по обработчикам не разбрасываются: новый вид события добавляется
 * строкой в эту таблицу, и TypeScript не даст её забыть.
 */
export type Audience =
  /** Владельцу компании по общим настройкам раздела «Уведомления». */
  | 'owner'
  /** Человеку, которому назначен наряд, — по адресам его учётной записи. */
  | 'assignee';

export const NOTIFICATION_AUDIENCE = {
  lead: 'owner',
  review: 'owner',
  'to-reminder': 'owner',
  /* Порог заказа — вопрос закупок, а он целиком владельческий: монтажнику
     сообщать, что в гараже кончается трасса, нечего — заказывает не он. */
  'stock-low': 'owner',
  'order-assigned': 'assignee',
  'order-changed': 'assignee',
  'order-cancelled': 'assignee',
} as const satisfies Record<NotificationKind, Audience>;

export function audienceOf(kind: NotificationKind): Audience {
  return NOTIFICATION_AUDIENCE[kind];
}

/**
 * Личные адреса доставки — снимок учётной записи на момент постановки.
 *
 * 🔴 Владелец копию адресного сообщения не получает (решение от 26 августа):
 * в сезон это двойной поток в его телеграм. Что и кому ушло, он смотрит в
 * журнале доставки раздела «Уведомления».
 */
export type DeliveryAddresses = {
  readonly telegram: string | null;
  readonly email: string | null;
};

export const NO_ADDRESSES: DeliveryAddresses = { telegram: null, email: null };

/** Пустая строка — это «не задано», а не адрес. */
function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function toDeliveryAddresses(source: {
  readonly telegramChatId: string | null;
  readonly email: string | null;
}): DeliveryAddresses {
  return { telegram: orNull(source.telegramChatId), email: orNull(source.email) };
}

/** Адрес получателя в конкретном канале. Незнакомый канал адреса не имеет. */
export function addressFor(channel: string, addresses: DeliveryAddresses): string | null {
  if (channel === 'telegram') return addresses.telegram;
  if (channel === 'email') return addresses.email;
  return null;
}

export function hasAnyAddress(addresses: DeliveryAddresses): boolean {
  return addresses.telegram !== null || addresses.email !== null;
}

/**
 * Порядок предпочтения каналов для человека: телеграм первым.
 *
 * Монтажник весь день с телефоном в руках, почту он открывает вечером. Порядок
 * нужен ровно в одном месте — когда адреса нет вовсе и надо решить, в какой
 * строке журнала показать отказ.
 */
export const PERSONAL_CHANNEL_ORDER: readonly ChannelName[] = ['telegram', 'email'];

export function preferredChannel(enabled: readonly string[]): string | null {
  const preferred = PERSONAL_CHANNEL_ORDER.find((channel) => enabled.includes(channel));
  return preferred ?? enabled[0] ?? null;
}
