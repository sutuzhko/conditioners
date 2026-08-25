// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-reminder',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  dbMock: {
    lead: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    rateLimit: { upsert: vi.fn() },
    setting: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { POST } = await import('./route');

function jsonRequest(body: unknown): Request {
  return new Request('https://example.test/api/leads/to-reminder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.rateLimit.upsert.mockResolvedValue({ hits: 1 });
  dbMock.notification.createMany.mockResolvedValue({ count: 1 });
  dbMock.lead.create.mockImplementation(async ({ data }) => ({ id: 'lead-9', ...data }));
  // пустая группа настроек → каналы по умолчанию: email включён (driver=log)
  dbMock.setting.findUnique.mockResolvedValue({ value: {} });
  // транзакция в моке прозрачна: настоящую атомарность обеспечивает Prisma
  dbMock.$transaction.mockImplementation(async (fn: (tx: typeof dbMock) => Promise<unknown>) =>
    fn(dbMock),
  );
});

describe('POST /api/leads/to-reminder', () => {
  it('сохраняет запрос напоминания как заявку на ТО', async () => {
    const response = await POST(
      jsonRequest({ phone: '+7 900 123-45-67', when: 'Установили этим летом', consent: true }),
    );

    expect(response.status).toBe(201);
    await expect(readBody(response)).resolves.toEqual({ id: 'lead-9' });
    expect(dbMock.lead.create.mock.calls[0]?.[0].data).toMatchObject({
      phone: '+79001234567',
      topic: 'ТО и чистка',
      comment: 'Установили этим летом',
    });
    expect(dbMock.lead.create.mock.calls[0]?.[0].data.consentAt).toBeInstanceOf(Date);
  });

  it('ставит уведомление в очередь после записи в базу', async () => {
    await POST(jsonRequest({ phone: '89001234567', consent: 'on' }));

    expect(dbMock.notification.createMany.mock.calls[0]?.[0].data).toEqual([
      expect.objectContaining({
        kind: 'to-reminder',
        payload: expect.objectContaining({ kind: 'to-reminder', phone: '+79001234567' }),
      }),
    ]);
  });

  it('без согласия отвечает 400 и ничего не пишет', async () => {
    const response = await POST(jsonRequest({ phone: '+79001234567' }));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toMatchObject({ field: 'consent' });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it('на телефон из пяти цифр отвечает 400', async () => {
    const response = await POST(jsonRequest({ phone: '12345', consent: true }));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toMatchObject({ field: 'phone' });
  });

  it('молча отбрасывает бота, заполнившего поле-ловушку', async () => {
    const response = await POST(jsonRequest({ phone: '+79001234567', consent: true, hp: 'x' }));

    expect(response.status).toBe(201);
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });
});
