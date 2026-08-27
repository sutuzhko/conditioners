/**
 * Данные для историй и тестов журнала доставки.
 *
 * Они же документируют, что фича ждёт от страницы: в базу она не ходит.
 */
import type {
  AddressApi,
  DeliveryAddressView,
  DeliveryEntryView,
  DeliveryFailureView,
  DeliverySummaryView,
  RetryApi,
} from './model';

export const summary: readonly DeliverySummaryView[] = [
  { channel: 'email', pending: 0, sent: 128, failed: 2 },
  { channel: 'telegram', pending: 1, sent: 341, failed: 0 },
];

export const ownerFailure: DeliveryFailureView = {
  id: 'n-1',
  channel: 'email',
  kind: 'lead',
  attempts: 6,
  lastError: 'Почтовый канал не настроен: не задан SMTP_HOST',
  status: 'failed',
  createdAt: '2026-08-26T09:12:00.000Z',
  recipient: null,
  address: null,
};

export const retryingFailure: DeliveryFailureView = {
  ...ownerFailure,
  id: 'n-2',
  kind: 'review',
  channel: 'telegram',
  attempts: 2,
  status: 'pending',
  lastError: 'Telegram недоступен: сеть не отвечает',
};

/** Адресный отказ: наряд назначен человеку, у которого нет ни чата, ни почты. */
export const noAddressFailure: DeliveryFailureView = {
  id: 'n-3',
  channel: 'telegram',
  kind: 'order-assigned',
  attempts: 0,
  lastError:
    'Дмитрий Соколов: не задан адрес доставки. Телеграм привязывается командой боту, ' +
    'почта заполняется в карточке человека.',
  status: 'failed',
  createdAt: '2026-08-26T10:02:00.000Z',
  recipient: 'Дмитрий Соколов',
  address: null,
};

export const sentEntry: DeliveryEntryView = {
  id: 'n-4',
  channel: 'telegram',
  kind: 'order-assigned',
  attempts: 1,
  lastError: null,
  status: 'sent',
  createdAt: '2026-08-26T10:05:00.000Z',
  sentAt: '2026-08-26T10:05:03.000Z',
  recipient: 'Дмитрий Соколов',
  address: '551234567',
  title: 'Вам назначен наряд № 1059',
};

export const changedEntry: DeliveryEntryView = {
  ...sentEntry,
  id: 'n-5',
  kind: 'order-changed',
  title: 'Изменился наряд № 1059',
  channel: 'email',
  address: 'sokolov@example.test',
  createdAt: '2026-08-26T12:40:00.000Z',
  sentAt: '2026-08-26T12:40:02.000Z',
};

export const pendingEntry: DeliveryEntryView = {
  ...sentEntry,
  id: 'n-6',
  kind: 'order-cancelled',
  title: 'Наряд № 1060 отменён',
  status: 'pending',
  sentAt: null,
  createdAt: '2026-08-26T13:10:00.000Z',
};

export const entries: readonly DeliveryEntryView[] = [pendingEntry, changedEntry, sentEntry];

export const owner: DeliveryAddressView = {
  id: 'u1',
  name: 'Алексей',
  role: 'owner',
  active: true,
  telegram: true,
  email: 'owner@example.test',
  code: 'K7M4PQR2',
};

export const boundInstaller: DeliveryAddressView = {
  id: 'u2',
  name: 'Дмитрий Соколов',
  role: 'installer',
  active: true,
  telegram: true,
  email: 'sokolov@example.test',
  code: 'H3N8TUV5',
};

export const freshInstaller: DeliveryAddressView = {
  id: 'u3',
  name: 'Пётр Ильин',
  role: 'installer',
  active: true,
  telegram: false,
  email: null,
  code: 'W9XY42BC',
};

export const firedInstaller: DeliveryAddressView = {
  ...freshInstaller,
  id: 'u4',
  name: 'Сергей Гущин',
  active: false,
  code: 'D6FG7HJK',
};

export const people: readonly DeliveryAddressView[] = [owner, boundInstaller, freshInstaller];

export const acceptingRetry: RetryApi = { retry: () => Promise.resolve({ ok: true }) };

export const failingRetry: RetryApi = {
  retry: () => Promise.resolve({ ok: false, message: 'Сессия истекла — войдите заново' }),
};

export const acceptingAddresses: AddressApi = {
  saveEmail: () => Promise.resolve({ ok: true }),
  unbind: () => Promise.resolve({ ok: true }),
};

export const failingAddresses: AddressApi = {
  saveEmail: () => Promise.resolve({ ok: false, message: 'Похоже, в адресе опечатка' }),
  unbind: () => Promise.resolve({ ok: false, message: 'Сессия истекла — войдите заново' }),
};
