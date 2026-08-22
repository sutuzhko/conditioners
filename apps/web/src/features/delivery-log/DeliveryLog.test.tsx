import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeliveryLog } from './DeliveryLog';
import { deliveryLogContent as texts } from './content';
import type { DeliveryFailureView, DeliverySummaryView, RetryApi } from './model';

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
};

const RETRYING: DeliveryFailureView = {
  ...FAILED,
  id: 'n-2',
  kind: 'review',
  attempts: 2,
  status: 'pending',
  lastError: 'Telegram недоступен: сеть не отвечает',
};

function setup(
  failures: readonly DeliveryFailureView[] = [FAILED],
  api: RetryApi = { retry: vi.fn(() => Promise.resolve({ ok: true })) },
) {
  return { api, ...render(<DeliveryLog summary={SUMMARY} failures={failures} api={api} />) };
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
    render(<DeliveryLog summary={SUMMARY} failures={[]} />);

    expect(screen.getByText(texts.failuresEmpty)).toBeInTheDocument();
  });

  it('без единого уведомления объясняет, почему список пуст', () => {
    render(<DeliveryLog summary={[]} failures={[]} />);

    expect(screen.getByText(texts.summaryEmpty)).toBeInTheDocument();
  });
});
