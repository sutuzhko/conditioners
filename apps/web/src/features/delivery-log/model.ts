/**
 * Журнал доставки уведомлений для админки.
 *
 * Типы повторяют то, что отдаёт репозиторий: страница читает данные на
 * сервере и передаёт сюда пропсами, фича в базу не ходит.
 */
export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export type DeliveryFailureView = {
  readonly id: string;
  readonly channel: string;
  readonly kind: string;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly status: DeliveryStatus;
  readonly createdAt: string;
  /** Кому адресовано; `null` — владельцу по общим настройкам компании. */
  readonly recipient: string | null;
  /** Адрес на момент постановки в очередь, а не текущий адрес человека. */
  readonly address: string | null;
};

/**
 * Строка журнала адресных сообщений.
 *
 * 🔴 Копию сообщения монтажнику владелец не получает (решение от 26 августа),
 * поэтому здесь видно и то, что доставлено: иначе он не знает, дошёл ли наряд.
 */
export type DeliveryEntryView = DeliveryFailureView & {
  readonly title: string;
  readonly sentAt: string | null;
};

export type DeliverySummaryView = {
  readonly channel: string;
  readonly pending: number;
  readonly sent: number;
  readonly failed: number;
};

/** Повтор доставки. Подменяется в историях и тестах. */
export type RetryApi = {
  retry(id: string): Promise<{ readonly ok: boolean; readonly message?: string }>;
};

/** Адрес доставки у человека из команды. */
export type DeliveryAddressView = {
  readonly id: string;
  readonly name: string;
  readonly role: 'owner' | 'installer';
  readonly active: boolean;
  /** Привязан ли чат телеграма — сам идентификатор чата владельцу не нужен. */
  readonly telegram: boolean;
  readonly email: string | null;
  /** Код привязки: человек присылает его боту, и бот запоминает чат. */
  readonly code: string;
};

export type AddressResult = { readonly ok: boolean; readonly message?: string };

export type AddressApi = {
  saveEmail(id: string, email: string): Promise<AddressResult>;
  unbind(id: string): Promise<AddressResult>;
};
