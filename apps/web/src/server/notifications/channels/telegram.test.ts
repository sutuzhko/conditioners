// @vitest-environment node
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPayload } from '../types';
import type { TelegramMessage, TelegramTransport } from './telegram';

const { testEnv, fetchMock, proxyAgents } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-telegram',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'live',
    TELEGRAM_TRANSPORT: 'direct',
    TELEGRAM_BOT_TOKEN: '1234567:TESTONLY-not-a-real-token',
    TELEGRAM_CHAT_ID: '-100500',
    TELEGRAM_PROXY_URL: '',
  },
  fetchMock: vi.fn(),
  proxyAgents: [] as string[],
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('undici', () => ({
  fetch: fetchMock,
  FormData,
  ProxyAgent: class {
    constructor(url: string) {
      proxyAgents.push(url);
    }
  },
}));

const { createTelegramChannel, httpTelegramTransport } = await import('./telegram');

const LEAD: NotificationPayload = {
  kind: 'lead',
  leadId: 'lead-1',
  name: 'Игорь',
  phone: '+79001234567',
  topic: 'Монтаж и установка',
  place: 'Квартира',
  qty: '1',
  callTime: 'после 18:00',
  address: null,
  comment: null,
  photo: null,
  sourceUrl: null,
};

const REVIEW: NotificationPayload = {
  kind: 'review',
  reviewId: 'r5',
  name: 'Игорь П.',
  rating: 5,
  text: 'Вчера установили 09-ку, всё аккуратно.',
  photo: null,
};

function recorder(): { transport: TelegramTransport; messages: TelegramMessage[] } {
  const messages: TelegramMessage[] = [];
  return {
    messages,
    transport: {
      async send(message: TelegramMessage): Promise<void> {
        messages.push(message);
      },
    },
  };
}

function ok(body: unknown = { ok: true }): { status: number; json: () => Promise<unknown> } {
  return { status: 200, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  proxyAgents.length = 0;
  testEnv.NOTIFY_DRIVER = 'live';
  testEnv.TELEGRAM_TRANSPORT = 'direct';
  testEnv.TELEGRAM_PROXY_URL = '';
});

describe('готовность канала', () => {
  it('выключен при TELEGRAM_TRANSPORT=off', () => {
    testEnv.TELEGRAM_TRANSPORT = 'off';
    expect(createTelegramChannel().isEnabled()).toBe(false);
  });

  it('в режиме лога работает без токена', () => {
    testEnv.NOTIFY_DRIVER = 'log';
    expect(createTelegramChannel().isEnabled()).toBe(true);
  });

  it('в боевом режиме требует токен и чат', () => {
    testEnv.TELEGRAM_BOT_TOKEN = '';
    expect(createTelegramChannel().isEnabled()).toBe(false);
    testEnv.TELEGRAM_BOT_TOKEN = '1234567:TESTONLY-not-a-real-token';
    expect(createTelegramChannel().isEnabled()).toBe(true);
  });
});

describe('сообщение владельцу', () => {
  it('заявка уходит текстом в привычной раскладке строк', async () => {
    const { transport, messages } = recorder();
    await createTelegramChannel(transport).send(LEAD);

    expect(messages[0]?.chatId).toBe('-100500');
    expect(messages[0]?.photoPath).toBeNull();
    expect(messages[0]?.buttons).toBeNull();
    expect(messages[0]?.text).toContain('🆕 Новая заявка с сайта');
    expect(messages[0]?.text).toContain('📞 Телефон: +79001234567');
    // незаполненные поля не пропадают, а показываются прочерком
    expect(messages[0]?.text).toContain('💬 Комментарий: —');
  });

  it('отзыв уходит с кнопками модерации и идентификатором в callback_data', async () => {
    const { transport, messages } = recorder();
    await createTelegramChannel(transport).send(REVIEW);

    expect(messages[0]?.text).toContain('⭐ Новый отзыв на модерации');
    expect(messages[0]?.text).toContain('★ Оценка: 5/5');
    expect(messages[0]?.buttons?.[0]).toEqual([
      { text: '✅ Одобрить', callback_data: 'rev:approve:r5' },
      { text: '🚫 Запретить', callback_data: 'rev:reject:r5' },
      { text: '📦 Архив', callback_data: 'rev:archive:r5' },
    ]);
  });

  it('фото превращается в путь на диске — его читает воркер', async () => {
    const { transport, messages } = recorder();
    await createTelegramChannel(transport).send({
      ...REVIEW,
      photo: '/api/media/0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg',
    });

    expect(messages[0]?.photoPath).toBe(
      '/tmp/tk-test-uploads-telegram/0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg',
    );
  });
});

describe('обращение к Bot API', () => {
  it('без фото шлёт sendMessage с отключённым предпросмотром ссылок', async () => {
    fetchMock.mockResolvedValue(ok());

    await httpTelegramTransport.send({
      chatId: '-100500',
      text: 'заявка',
      photoPath: null,
      buttons: null,
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/sendMessage');
    expect(JSON.parse(String(init.body))).toEqual({
      chat_id: '-100500',
      text: 'заявка',
      disable_web_page_preview: true,
    });
  });

  it('с фото шлёт sendPhoto и кладёт текст в подпись', async () => {
    fetchMock.mockResolvedValue(ok());
    await mkdir('/tmp/tk-test-uploads-telegram/reviews', { recursive: true });
    await writeFile('/tmp/tk-test-uploads-telegram/reviews/a.jpg', Buffer.from([0xff, 0xd8]));

    await httpTelegramTransport.send({
      chatId: '-100500',
      text: 'отзыв',
      photoPath: '/tmp/tk-test-uploads-telegram/reviews/a.jpg',
      buttons: [[{ text: '✅ Одобрить', callback_data: 'rev:approve:r5' }]],
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/sendPhoto');
    const body: unknown = init.body;
    expect(body).toBeInstanceOf(FormData);
    if (body instanceof FormData) {
      expect(body.get('caption')).toBe('отзыв');
      expect(String(body.get('reply_markup'))).toContain('inline_keyboard');
      expect(body.get('photo')).toBeInstanceOf(Blob);
    }
  });

  it('при TELEGRAM_TRANSPORT=proxy поднимает ProxyAgent на заданный адрес', async () => {
    fetchMock.mockResolvedValue(ok());
    testEnv.TELEGRAM_TRANSPORT = 'proxy';
    testEnv.TELEGRAM_PROXY_URL = 'http://proxy.example:3128';

    await httpTelegramTransport.send({
      chatId: '-100500',
      text: 'заявка',
      photoPath: null,
      buttons: null,
    });

    expect(proxyAgents).toEqual(['http://proxy.example:3128']);
    expect(fetchMock.mock.calls[0]?.[1].dispatcher).toBeDefined();
  });

  it('без адреса прокси объясняет, чего не хватает', async () => {
    testEnv.TELEGRAM_TRANSPORT = 'proxy';

    await expect(
      httpTelegramTransport.send({ chatId: '1', text: 'x', photoPath: null, buttons: null }),
    ).rejects.toThrow('TELEGRAM_PROXY_URL');
  });

  it('🔴 не выносит токен в текст ошибки: lastError виден в админке', async () => {
    fetchMock.mockResolvedValue(
      ok({ ok: false, description: `Unauthorized for bot${testEnv.TELEGRAM_BOT_TOKEN}` }),
    );

    const failure = httpTelegramTransport.send({
      chatId: '1',
      text: 'x',
      photoPath: null,
      buttons: null,
    });

    await expect(failure).rejects.toThrow('<токен>');
    await failure.catch((error: unknown) => {
      expect(String(error)).not.toContain(testEnv.TELEGRAM_BOT_TOKEN);
    });
  });

  it('сетевой сбой превращается в понятную ошибку, а не в падение воркера', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    await expect(
      httpTelegramTransport.send({ chatId: '1', text: 'x', photoPath: null, buttons: null }),
    ).rejects.toThrow('Telegram недоступен');
  });
});
