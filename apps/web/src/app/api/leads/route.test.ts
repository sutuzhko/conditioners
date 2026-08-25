// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, dbMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-leads',
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

type Fields = Readonly<Record<string, string>>;

function leadRequest(fields: Fields, headers: Readonly<Record<string, string>> = {}): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request('https://example.test/api/leads', { method: 'POST', body: form, headers });
}

/** Браузер вообще не отправляет неотмеченный чекбокс — воспроизводим это буквально. */
function without(fields: Fields, key: string): Fields {
  const copy: Record<string, string> = { ...fields };
  delete copy[key];
  return copy;
}

const VALID: Fields = {
  name: 'Игорь',
  phone: '8 (900) 123-45-67',
  topic: 'Монтаж и установка',
  place: 'Квартира',
  qty: '1',
  time: 'после 18:00',
  address: 'Привокзальный р-н',
  comment: 'Второй этаж',
  consent: 'on',
};

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await response.json();
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.rateLimit.upsert.mockResolvedValue({ hits: 1 });
  dbMock.notification.createMany.mockResolvedValue({ count: 1 });
  dbMock.lead.create.mockImplementation(async ({ data }) => ({ id: 'lead-1', ...data }));
  // пустая группа настроек → каналы по умолчанию: email включён (driver=log)
  dbMock.setting.findUnique.mockResolvedValue({ value: {} });
  // транзакция в моке прозрачна: настоящую атомарность обеспечивает Prisma
  dbMock.$transaction.mockImplementation(async (fn: (tx: typeof dbMock) => Promise<unknown>) =>
    fn(dbMock),
  );
});

describe('POST /api/leads', () => {
  it('принимает заявку, нормализует телефон и фиксирует согласие', async () => {
    const response = await POST(leadRequest(VALID));

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('charset=utf-8');
    await expect(readBody(response)).resolves.toEqual({ id: 'lead-1' });

    const [call] = dbMock.lead.create.mock.calls;
    expect(call?.[0].data).toMatchObject({
      name: 'Игорь',
      phone: '+79001234567',
      topic: 'Монтаж и установка',
      callTime: 'после 18:00',
      address: 'Привокзальный р-н',
    });
    expect(call?.[0].data.consentAt).toBeInstanceOf(Date);
  });

  it('пишет заявку в базу раньше, чем ставит уведомление в очередь', async () => {
    await POST(leadRequest(VALID));

    const [leadOrder] = dbMock.lead.create.mock.invocationCallOrder;
    const [queueOrder] = dbMock.notification.createMany.mock.invocationCallOrder;
    expect(leadOrder).toBeDefined();
    expect(queueOrder).toBeDefined();
    expect(Number(leadOrder)).toBeLessThan(Number(queueOrder));
  });

  it('ставит уведомление в настроенный канал', async () => {
    await POST(leadRequest(VALID));

    const [call] = dbMock.notification.createMany.mock.calls;
    expect(call?.[0].data).toEqual([
      expect.objectContaining({
        channel: 'email',
        kind: 'lead',
        payload: expect.objectContaining({ kind: 'lead', phone: '+79001234567' }),
      }),
    ]);
  });

  it('сбой постановки в очередь откатывает транзакцию и отдаёт ошибку (ADR-091)', async () => {
    dbMock.notification.createMany.mockRejectedValue(new Error('соединение потеряно'));

    const response = await POST(leadRequest(VALID));

    // раньше здесь был 201: заявка сохранялась, но уведомление молча терялось —
    // владелец узнал бы о клиенте, только случайно открыв список заявок
    expect(response.status).toBe(500);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('заявка и уведомление пишутся внутри одной транзакции', async () => {
    await POST(leadRequest(VALID));

    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(dbMock.lead.create).toHaveBeenCalledTimes(1);
    expect(dbMock.notification.createMany).toHaveBeenCalledTimes(1);
  });

  it('без согласия на обработку данных отвечает 400 и не пишет заявку', async () => {
    const response = await POST(leadRequest(without(VALID, 'consent')));

    expect(response.status).toBe(400);
    await expect(readBody(response)).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: expect.stringContaining('согласия'),
        field: 'consent',
      },
    });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it('на пустые обязательные поля отвечает по-русски, а не сообщением Zod', async () => {
    const empty = await POST(leadRequest({ ...VALID, name: '', phone: '' }));
    const message = String(((await readBody(empty)).error as { message: string }).message);

    // латиницы в тексте быть не должно: его читает клиент, а не разработчик
    expect(message).not.toMatch(/[A-Za-z]/);
  });

  it('на некорректный телефон отвечает 400 с указанием поля', async () => {
    const response = await POST(leadRequest({ ...VALID, phone: '12-34' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({ code: 'validation_error', field: 'phone' });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it('молча отбрасывает бота, заполнившего поле-ловушку', async () => {
    const response = await POST(leadRequest({ ...VALID, hp: 'https://spam.example' }));

    expect(response.status).toBe(201);
    expect(dbMock.lead.create).not.toHaveBeenCalled();
    expect(dbMock.notification.createMany).not.toHaveBeenCalled();
  });

  it('при превышении частоты по IP отвечает 429', async () => {
    dbMock.rateLimit.upsert.mockResolvedValue({ hits: 6 });

    const response = await POST(leadRequest(VALID, { 'x-forwarded-for': '203.0.113.7' }));
    const body = await readBody(response);

    expect(response.status).toBe(429);
    expect(body.error).toMatchObject({ code: 'rate_limited' });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
    expect(dbMock.rateLimit.upsert.mock.calls[0]?.[0].where.key_windowAt.key).toBe(
      '203.0.113.7:leads',
    );
  });

  it('не пытается разбирать заведомо огромное тело', async () => {
    const response = await POST(leadRequest(VALID, { 'content-length': String(20 * 1_048_576) }));
    const body = await readBody(response);

    expect(response.status).toBe(413);
    expect(body.error).toMatchObject({ code: 'payload_too_large' });
  });

  it('запоминает страницу-источник, реферер и utm-метки', async () => {
    const response = await POST(
      leadRequest(
        {
          ...VALID,
          sourceUrl: 'https://example.test/prices?utm_source=yandex&utm_campaign=leto',
          referrer: 'https://yandex.ru/search/',
        },
        { referer: 'https://example.test/other' },
      ),
    );

    expect(response.status).toBe(201);
    expect(dbMock.lead.create.mock.calls[0]?.[0].data).toMatchObject({
      sourceUrl: 'https://example.test/prices?utm_source=yandex&utm_campaign=leto',
      referrer: 'https://yandex.ru/search/',
      utm: { utm_source: 'yandex', utm_campaign: 'leto' },
    });
  });

  it('без темы подставляет консультацию, а пустые поля пишет как null', async () => {
    await POST(leadRequest({ name: 'Игорь', phone: '+79001234567', consent: 'true' }));

    expect(dbMock.lead.create.mock.calls[0]?.[0].data).toMatchObject({
      topic: 'Консультация',
      place: null,
      qty: null,
      callTime: null,
      address: null,
      comment: null,
      photo: null,
    });
  });
});
