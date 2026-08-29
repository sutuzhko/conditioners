// @vitest-environment node
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPayload } from '../types';
import type { MailMessage, MailTransport } from './email';

const { testEnv, createTransportMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(() => ({ sendMail: vi.fn() })),
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-email',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'live',
    TELEGRAM_TRANSPORT: 'off',
    SMTP_HOST: 'smtp.example',
    SMTP_FROM: 'site@example.test',
    NOTIFY_EMAIL_TO: 'owner@example.test',
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
// настоящий транспорт в тестах не создаётся: проверяем только его настройку
vi.mock('nodemailer', () => ({ createTransport: createTransportMock }));

const { createEmailChannel, logMailTransport } = await import('./email');

/** Имя файла, какое выдаёт хранилище: uuid и расширение. */
const PHOTO = '0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg';

const LEAD: NotificationPayload = {
  kind: 'lead',
  leadId: 'lead-1',
  name: 'Игорь',
  phone: '+79001234567',
  topic: 'Монтаж и установка',
  place: 'Квартира',
  qty: '1',
  callTime: 'после 18:00',
  address: 'Привокзальный р-н',
  comment: 'Второй этаж',
  photo: null,
  sourceUrl: 'https://example.test/prices',
};

function recorder(): { transport: MailTransport; letters: MailMessage[] } {
  const letters: MailMessage[] = [];
  return {
    letters,
    transport: {
      async sendMail(message: MailMessage): Promise<void> {
        letters.push(message);
      },
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  testEnv.NOTIFY_DRIVER = 'live';
  testEnv.SMTP_HOST = 'smtp.example';
  testEnv.SMTP_FROM = 'site@example.test';
  testEnv.NOTIFY_EMAIL_TO = 'owner@example.test';
});

describe('готовность канала', () => {
  it('в режиме лога работает без настроек SMTP', () => {
    testEnv.NOTIFY_DRIVER = 'log';
    testEnv.SMTP_HOST = '';
    expect(createEmailChannel().isEnabled()).toBe(true);
  });

  it('в боевом режиме требует хост, отправителя и получателя', () => {
    expect(createEmailChannel().isEnabled()).toBe(true);
    testEnv.NOTIFY_EMAIL_TO = '';
    expect(createEmailChannel().isEnabled()).toBe(false);
  });
});

describe('письмо владельцу', () => {
  it('содержит все поля заявки и ссылку в админку', async () => {
    const { transport, letters } = recorder();
    await createEmailChannel(transport).send(LEAD);

    expect(letters[0]).toMatchObject({
      from: 'site@example.test',
      to: 'owner@example.test',
      subject: 'Новая заявка с сайта: Монтаж и установка',
    });
    expect(letters[0]?.text).toContain('👤 Имя: Игорь');
    expect(letters[0]?.text).toContain('📞 Телефон: +79001234567');
    expect(letters[0]?.text).toContain('https://example.test/admin/leads');
    expect(letters[0]?.attachments).toEqual([]);
  });

  it('на отзыв ведёт ссылка в раздел модерации', async () => {
    const { transport, letters } = recorder();
    await createEmailChannel(transport).send({
      kind: 'review',
      reviewId: 'r5',
      name: 'Игорь П.',
      rating: 4,
      text: 'Работой доволен, приехали вовремя.',
      photo: null,
    });

    expect(letters[0]?.subject).toBe('Новый отзыв на модерации: 4/5');
    expect(letters[0]?.text).toContain('https://example.test/admin/reviews');
  });

  /**
   * 🔴 Хранилища у двух снимков разные (ADR-171): фото при заявке лежит в
   * закрытом подкаталоге и в базе значится именем файла, снимок при отзыве
   * публикуется на сайте и остаётся адресом. Воркер обязан найти оба.
   */
  it('прикладывает фото заявки из закрытого хранилища', async () => {
    await mkdir('/tmp/tk-test-uploads-email/protected', { recursive: true });
    await writeFile(`/tmp/tk-test-uploads-email/protected/${PHOTO}`, Buffer.from([0xff, 0xd8]));

    const { transport, letters } = recorder();
    await createEmailChannel(transport).send({ ...LEAD, photo: PHOTO });

    expect(letters[0]?.attachments).toEqual([
      { filename: PHOTO, path: `/tmp/tk-test-uploads-email/protected/${PHOTO}` },
    ]);
  });

  it('прикладывает фото отзыва из открытого каталога', async () => {
    await mkdir('/tmp/tk-test-uploads-email', { recursive: true });
    await writeFile(`/tmp/tk-test-uploads-email/${PHOTO}`, Buffer.from([0xff, 0xd8]));

    const { transport, letters } = recorder();
    await createEmailChannel(transport).send({
      kind: 'review',
      reviewId: 'r5',
      name: 'Игорь П.',
      rating: 4,
      text: 'Работой доволен, приехали вовремя.',
      photo: `/api/media/${PHOTO}`,
    });

    expect(letters[0]?.attachments).toEqual([
      { filename: PHOTO, path: `/tmp/tk-test-uploads-email/${PHOTO}` },
    ]);
  });

  it('🔴 фото заявки не ищется в открытом каталоге: адрес там ничего не значит', async () => {
    await mkdir('/tmp/tk-test-uploads-email', { recursive: true });
    await writeFile(`/tmp/tk-test-uploads-email/${PHOTO}`, Buffer.from([0xff, 0xd8]));

    const { transport, letters } = recorder();
    await createEmailChannel(transport).send({ ...LEAD, photo: `/api/media/${PHOTO}` });

    // письмо важнее вложения: заявка доходит и без снимка
    expect(letters[0]?.attachments).toEqual([]);
  });

  it('не срывает отправку, если файла на диске уже нет', async () => {
    const { transport, letters } = recorder();
    await createEmailChannel(transport).send({
      ...LEAD,
      photo: '/api/media/1b2c3d4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg',
    });

    expect(letters[0]?.attachments).toEqual([]);
  });

  it('в режиме лога письмо не уходит, а печатается', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await logMailTransport.sendMail({
      from: 'site@example.test',
      to: 'owner@example.test',
      subject: 'Новая заявка',
      text: 'тело письма',
      attachments: [],
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain('тело письма');
  });

  it('SMTP-транспорт создаётся с таймаутами: зависшее письмо не стопорит очередь', async () => {
    // транспорт не передан — канал соберёт его сам из настроек окружения
    await createEmailChannel().send(LEAD);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 5_000,
        greetingTimeout: 5_000,
        socketTimeout: 15_000,
      }),
    );
  });
});
