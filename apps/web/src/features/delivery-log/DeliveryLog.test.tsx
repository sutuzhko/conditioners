import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeliveryLog } from './DeliveryLog';
import { deliveryLogContent as texts } from './content';
import type {
  DeliveryEntryView,
  DeliveryFailureView,
  DeliverySummaryView,
  RetryApi,
} from './model';

const SUMMARY: readonly DeliverySummaryView[] = [
  { channel: 'email', pending: 0, sent: 12, failed: 2 },
  { channel: 'telegram', pending: 1, sent: 40, failed: 0 },
];

const FAILED: DeliveryFailureView = {
  id: 'n-1',
  channel: 'email',
  kind: 'lead',
  attempts: 6,
  lastError: 'Почтовый канал не настроен: не задан SMTP_HOST',
  status: 'failed',
  createdAt: '2026-08-22T09:00:00.000Z',
  recipient: null,
  address: null,
};

const RETRYING: DeliveryFailureView = {
  ...FAILED,
  id: 'n-2',
  kind: 'review',
  attempts: 2,
  status: 'pending',
  lastError: 'Telegram недоступен: сеть не отвечает',
};

/** Отказ адресного уведомления: адреса у человека нет вовсе. */
const NO_ADDRESS: DeliveryFailureView = {
  id: 'n-3',
  channel: 'telegram',
  kind: 'order-assigned',
  attempts: 0,
  lastError: 'Дмитрий Соколов: не задан адрес доставки.',
  status: 'failed',
  createdAt: '2026-08-26T09:00:00.000Z',
  recipient: 'Дмитрий Соколов',
  address: null,
};

const SENT: DeliveryEntryView = {
  id: 'n-4',
  channel: 'telegram',
  kind: 'order-assigned',
  attempts: 1,
  lastError: null,
  status: 'sent',
  createdAt: '2026-08-26T10:00:00.000Z',
  sentAt: '2026-08-26T10:00:05.000Z',
  recipient: 'Дмитрий Соколов',
  address: '551234567',
  title: 'Вам назначен наряд № 1059',
};

function setup(
  failures: readonly DeliveryFailureView[] = [FAILED],
  api: RetryApi = { retry: vi.fn(() => Promise.resolve({ ok: true })) },
  entries: readonly DeliveryEntryView[] = [],
) {
  return {
    api,
    ...render(<DeliveryLog summary={SUMMARY} failures={failures} entries={entries} api={api} />),
  };
}

describe('Журнал доставки', () => {
  it('показывает сводку по каналам', () => {
    // имя канала встречается и в сводке, и в карточке сбоя — берём сводку
    const { container } = setup();
    const summary = container.querySelectorAll('[class*="channelName"]');

    expect([...summary].map((node) => node.textContent)).toEqual(['email', 'telegram']);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('🔴 показывает причину сбоя дословно: без неё «письмо не пришло» — догадка', () => {
    setup();

    expect(screen.getByText(FAILED.lastError ?? '')).toBeInTheDocument();
    expect(screen.getByText(texts.kindLead)).toBeInTheDocument();
    expect(screen.getByText(texts.attempts(6), { exact: false })).toBeInTheDocument();
  });

  it('различает отказ и то, что ещё повторяется', () => {
    setup([FAILED, RETRYING]);

    expect(screen.getByText(texts.statusFailed)).toBeInTheDocument();
    expect(screen.getByText(texts.statusRetrying)).toBeInTheDocument();
  });

  it('🔴 повторить можно только отказ: у ждущего очереди попытки ещё есть', () => {
    setup([RETRYING]);

    expect(screen.queryByRole('button', { name: texts.retry })).not.toBeInTheDocument();
  });

  it('повтор возвращает уведомление в очередь и говорит об этом', async () => {
    const user = userEvent.setup();
    const { api } = setup();

    await user.click(screen.getByRole('button', { name: texts.retry }));

    expect(api.retry).toHaveBeenCalledWith('n-1');
    expect(await screen.findByText(texts.retryDone)).toBeInTheDocument();
  });

  it('🔴 отказ сервера при повторе объясняется, а не проглатывается', async () => {
    const user = userEvent.setup();
    setup([FAILED], { retry: () => Promise.resolve({ ok: false, message: 'Сессия истекла' }) });

    await user.click(screen.getByRole('button', { name: texts.retry }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сессия истекла');
  });

  it('пустой журнал говорит, что сбоев нет', () => {
    render(<DeliveryLog summary={SUMMARY} failures={[]} entries={[]} />);

    expect(screen.getByText(texts.failuresEmpty)).toBeInTheDocument();
  });

  it('без единого уведомления объясняет, почему список пуст', () => {
    render(<DeliveryLog summary={[]} failures={[]} entries={[]} />);

    expect(screen.getByText(texts.summaryEmpty)).toBeInTheDocument();
  });

  it('уведомление владельца подписано общим адресом компании', () => {
    setup();

    expect(screen.getByText(texts.recipientOwner, { exact: false })).toBeInTheDocument();
  });

  it('🔴 у адресного сбоя видно, кому не дошло', () => {
    setup([NO_ADDRESS]);

    // имя встречается дважды: в строке «кому» и внутри причины отказа
    expect(
      screen.getByText(`${texts.recipientPrefix} Дмитрий Соколов`, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(texts.kindOrderAssigned)).toBeInTheDocument();
  });
});

describe('Что ушло людям', () => {
  it('🔴 доставленное монтажнику видно владельцу: копию сообщением он не получает', () => {
    setup([], { retry: vi.fn() }, [SENT]);

    expect(screen.getByText(SENT.title)).toBeInTheDocument();
    expect(screen.getByText('Дмитрий Соколов · 551234567', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(texts.statusSent)).toBeInTheDocument();
  });

  it('пустая лента объясняет, почему она пуста', () => {
    setup();

    expect(screen.getByText(texts.feedEmpty)).toBeInTheDocument();
  });
});
