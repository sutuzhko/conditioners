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
