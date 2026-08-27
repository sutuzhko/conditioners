// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, reviewsMock, telegramMock, revalidateMock, usersMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-webhook',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'direct',
    TELEGRAM_WEBHOOK_SECRET: 'secret-token-42',
  } as Record<string, unknown>,
  reviewsMock: { setStatus: vi.fn() },
  telegramMock: {
    answerCallbackQuery: vi.fn(),
    editMessageText: vi.fn(),
    sendChatMessage: vi.fn(),
  },
  revalidateMock: { revalidateReviews: vi.fn() },
  usersMock: {
    listDeliveryTargets: vi.fn(),
    bindTelegramChat: vi.fn(),
    unbindTelegramChat: vi.fn(),
  },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/reviews', () => reviewsMock);
vi.mock('@/server/notifications/channels/telegram', () => telegramMock);
vi.mock('@/server/revalidate', () => revalidateMock);
vi.mock('@/server/repo/admin-users', () => usersMock);

const { POST } = await import('./route');
const { bindingCode, bindingReplies } = await import('@/server/notifications/binding');

const REVIEW_ID = 'rev-42';

function update(data: string, extra: Record<string, unknown> = {}): unknown {
  return {
    callback_query: {
      id: 'cb-1',
      data,
      from: { first_name: 'Ирина' },
      message: { message_id: 77, text: 'Новый отзыв', chat: { id: -100 } },
      ...extra,
    },
  };
}

/* Секрет только из ASCII: Telegram разрешает A–Z, a–z, 0–9, дефис и
   подчёркивание, а заголовок HTTP кириллицу и не унесёт. */
function request(body: unknown, secret: string | null = 'secret-token-42'): Request {
  return new Request('https://example.test/api/telegram/webhook', {
    method: 'POST',
    headers: secret === null ? {} : { 'x-telegram-bot-api-secret-token': secret },
    body: JSON.stringify(body),
  });
}

/** Сообщение в чат: им человек привязывает свой телеграм к учётной записи. */
function chat(text: string): unknown {
  return { message: { message_id: 5, text, chat: { id: 551234567 } } };
}

const INSTALLER = { id: 'u2', name: 'Дмитрий Соколов', login: 'sokolov', active: true };

beforeEach(() => {
  vi.clearAllMocks();
  testEnv.TELEGRAM_WEBHOOK_SECRET = 'secret-token-42';
  reviewsMock.setStatus.mockResolvedValue({ id: REVIEW_ID, status: 'approved' });
  telegramMock.answerCallbackQuery.mockResolvedValue(undefined);
  telegramMock.editMessageText.mockResolvedValue(undefined);
  telegramMock.sendChatMessage.mockResolvedValue(undefined);
  usersMock.listDeliveryTargets.mockResolvedValue([INSTALLER]);
  usersMock.bindTelegramChat.mockResolvedValue(undefined);
  usersMock.unbindTelegramChat.mockResolvedValue([]);
});

describe('POST /api/telegram/webhook', () => {
  it('🔴 без верного секрета отвечает 404 и ничего не меняет', async () => {
    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`), 'wrong-token'));

    expect(response.status).toBe(404);
    expect(reviewsMock.setStatus).not.toHaveBeenCalled();
  });

  it('🔴 без заголовка секрета — тоже 404: адрес не подтверждает сам себя', async () => {
    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`), null));

    expect(response.status).toBe(404);
    expect(reviewsMock.setStatus).not.toHaveBeenCalled();
  });

  it('🔴 секрет не задан в окружении — вебхук выключен целиком', async () => {
    testEnv.TELEGRAM_WEBHOOK_SECRET = undefined;

    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`), 'secret-token-42'));

    expect(response.status).toBe(404);
    expect(reviewsMock.setStatus).not.toHaveBeenCalled();
  });

  it('одобрение меняет статус отзыва и сбрасывает кеш страницы', async () => {
    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`)));

    expect(response.status).toBe(200);
    expect(reviewsMock.setStatus).toHaveBeenCalledWith(REVIEW_ID, 'approved');
    expect(revalidateMock.revalidateReviews).toHaveBeenCalled();
  });

  it('запрет и архив переводят отзыв в свои статусы', async () => {
    await POST(request(update(`rev:reject:${REVIEW_ID}`)));
    expect(reviewsMock.setStatus).toHaveBeenLastCalledWith(REVIEW_ID, 'rejected');

    await POST(request(update(`rev:archive:${REVIEW_ID}`)));
    expect(reviewsMock.setStatus).toHaveBeenLastCalledWith(REVIEW_ID, 'archived');
  });

  it('отвечает на нажатие и дописывает итог в сообщение, убирая кнопки', async () => {
    await POST(request(update(`rev:approve:${REVIEW_ID}`)));

    expect(telegramMock.answerCallbackQuery).toHaveBeenCalledWith(
      'cb-1',
      expect.stringContaining('Одобрено'),
    );

    const [chatId, messageId, text] = telegramMock.editMessageText.mock.calls[0] ?? [];
    expect(chatId).toBe(-100);
    expect(messageId).toBe(77);
    expect(text).toContain('Новый отзыв');
    expect(text).toContain('Одобрено');
    // видно, кто нажал: иначе двое модераторов жмут по очереди на одно и то же
    expect(text).toContain('Ирина');
  });

  it('🔴 чужая команда в callback_data не трогает базу', async () => {
    const response = await POST(request(update('drop:table:reviews')));

    expect(response.status).toBe(200);
    expect(reviewsMock.setStatus).not.toHaveBeenCalled();
    expect(telegramMock.answerCallbackQuery).toHaveBeenCalledWith('cb-1', 'Неизвестная команда');
  });

  it('обновление без нажатия кнопки принимается молча', async () => {
    const response = await POST(request({ message: { text: 'привет' } }));

    expect(response.status).toBe(200);
    expect(reviewsMock.setStatus).not.toHaveBeenCalled();
    expect(telegramMock.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('🔴 сбой базы отвечает 200: иначе Telegram повторяет доставку по кругу', async () => {
    reviewsMock.setStatus.mockRejectedValue(new Error('база недоступна'));

    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`)));

    expect(response.status).toBe(200);
    expect(telegramMock.answerCallbackQuery).toHaveBeenCalledWith(
      'cb-1',
      expect.stringContaining('админку'),
    );
  });

  it('🔴 недоступный Telegram не отменяет уже применённую модерацию', async () => {
    telegramMock.answerCallbackQuery.mockRejectedValue(new Error('нет сети'));
    telegramMock.editMessageText.mockRejectedValue(new Error('нет сети'));

    const response = await POST(request(update(`rev:approve:${REVIEW_ID}`)));

    expect(response.status).toBe(200);
    expect(reviewsMock.setStatus).toHaveBeenCalledWith(REVIEW_ID, 'approved');
  });
});

describe('Привязка чата командой боту', () => {
  it('верный код привязывает чат к учётной записи и бот это подтверждает', async () => {
    const response = await POST(request(chat(`/start ${bindingCode(INSTALLER.id)}`)));

    expect(response.status).toBe(200);
    expect(usersMock.bindTelegramChat).toHaveBeenCalledWith('u2', '551234567');
    expect(telegramMock.sendChatMessage).toHaveBeenCalledWith(
      '551234567',
      expect.stringContaining('Дмитрий Соколов'),
    );
  });

  it('🔴 чужим кодом чужую учётную запись не привяжешь', async () => {
    const response = await POST(request(chat(bindingCode('другой-человек'))));

    expect(response.status).toBe(200);
    expect(usersMock.bindTelegramChat).not.toHaveBeenCalled();
    expect(telegramMock.sendChatMessage).toHaveBeenCalledWith(
      '551234567',
      bindingReplies.unknownCode,
    );
  });

  it('🔴 отключённая учётная запись привязку не получает', async () => {
    usersMock.listDeliveryTargets.mockResolvedValue([{ ...INSTALLER, active: false }]);

    await POST(request(chat(bindingCode(INSTALLER.id))));

    expect(usersMock.bindTelegramChat).not.toHaveBeenCalled();
  });

  it('/start без кода объясняет, где код взять', async () => {
    await POST(request(chat('/start')));

    expect(telegramMock.sendChatMessage).toHaveBeenCalledWith('551234567', bindingReplies.help);
    expect(usersMock.bindTelegramChat).not.toHaveBeenCalled();
  });

  it('/stop отписывает чат', async () => {
    usersMock.unbindTelegramChat.mockResolvedValue(['Дмитрий Соколов']);

    await POST(request(chat('/stop')));

    expect(usersMock.unbindTelegramChat).toHaveBeenCalledWith('551234567');
    expect(telegramMock.sendChatMessage).toHaveBeenCalledWith('551234567', bindingReplies.unbound);
  });

  it('обычное сообщение бот не считает командой и в базу не ходит', async () => {
    const response = await POST(request(chat('а когда приедут?')));

    expect(response.status).toBe(200);
    expect(usersMock.listDeliveryTargets).not.toHaveBeenCalled();
    expect(telegramMock.sendChatMessage).not.toHaveBeenCalled();
  });

  it('🔴 сбой базы при привязке отвечает 200: иначе Telegram шлёт обновление по кругу', async () => {
    usersMock.listDeliveryTargets.mockRejectedValue(new Error('база недоступна'));

    const response = await POST(request(chat(bindingCode(INSTALLER.id))));

    expect(response.status).toBe(200);
    expect(telegramMock.sendChatMessage).toHaveBeenCalledWith(
      '551234567',
      bindingReplies.unknownCode,
    );
  });

  it('🔴 без верного секрета команда привязки не рассматривается вовсе', async () => {
    const response = await POST(request(chat(bindingCode(INSTALLER.id)), 'wrong-token'));

    expect(response.status).toBe(404);
    expect(usersMock.bindTelegramChat).not.toHaveBeenCalled();
  });
});
