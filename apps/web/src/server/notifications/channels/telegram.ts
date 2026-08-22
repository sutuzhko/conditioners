import { readFile } from 'node:fs/promises';
import { FormData as UndiciFormData, ProxyAgent, fetch as undiciFetch } from 'undici';
import { z } from 'zod';
import { env } from '@/shared/config/env';
import { resolveUploadPath } from '@/server/uploads/store';
import { attachedPhoto, notificationText } from '../format';
import type { NotificationChannel, NotificationPayload } from '../types';

/**
 * Telegram — канал удобства, а не гарантии (ADR-007): доступность
 * `api.telegram.org` из российского дата-центра не проверяема заранее,
 * поэтому транспорт переключается переменной `TELEGRAM_TRANSPORT`:
 *
 *  direct — обычный запрос;
 *  proxy  — через `ProxyAgent` из undici на прокси за пределами РФ;
 *  off    — канал молчит и в очередь не ставится.
 *
 * При `NOTIFY_DRIVER=log` сообщение пишется в лог и никуда не уходит:
 * на том конце бота живой человек, дев-окружение не должно его беспокоить.
 */
export type InlineButton = {
  readonly text: string;
  readonly callback_data: string;
};

export type TelegramMessage = {
  readonly chatId: string;
  readonly text: string;
  /** Путь к файлу на диске: с фото сообщение уходит как `sendPhoto` с подписью. */
  readonly photoPath: string | null;
  readonly buttons: readonly (readonly InlineButton[])[] | null;
};

export type TelegramTransport = {
  send(message: TelegramMessage): Promise<void>;
};

/** Ограничения Bot API: 4096 символов на сообщение и 1024 на подпись к фото. */
const TEXT_LIMIT = 4000;
const CAPTION_LIMIT = 1000;
const TIMEOUT_MS = 10_000;

const replySchema = z.object({ ok: z.boolean(), description: z.string().optional() });

/**
 * 🔴 Токен не должен попасть ни в лог, ни в сообщение об ошибке, ни в админку:
 * `lastError` виден владельцу, а текст ошибки может прийти откуда угодно.
 */
function redactToken(text: string): string {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (token === undefined || token === '') return text;
  return text.split(token).join('<токен>');
}

let proxyAgent: ProxyAgent | null = null;

function dispatcher(): ProxyAgent | null {
  if (env.TELEGRAM_TRANSPORT !== 'proxy') return null;
  const url = env.TELEGRAM_PROXY_URL;
  if (url === undefined || url === '') {
    throw new Error('Транспорт Telegram выставлен в proxy, но TELEGRAM_PROXY_URL не задан');
  }
  proxyAgent ??= new ProxyAgent(url);
  return proxyAgent;
}

async function callApi(method: string, body: UndiciFormData | string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (token === undefined || token === '') {
    throw new Error('Канал Telegram не настроен: не задан TELEGRAM_BOT_TOKEN');
  }

  const agent = dispatcher();
  const headers = typeof body === 'string' ? { 'content-type': 'application/json' } : undefined;

  let response: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    response = await undiciFetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      ...(headers === undefined ? {} : { headers }),
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(agent === null ? {} : { dispatcher: agent }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Telegram недоступен: ${redactToken(reason)}`);
  }

  const parsed = replySchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new Error(`Telegram ответил неожиданным телом, HTTP ${response.status}`);
  }
  if (!parsed.data.ok) {
    throw new Error(`Telegram отклонил сообщение: ${redactToken(parsed.data.description ?? '')}`);
  }
}

export const logTelegramTransport: TelegramTransport = {
  async send(message: TelegramMessage): Promise<void> {
    const buttons =
      message.buttons === null
        ? ''
        : `\nКнопки: ${message.buttons
            .flat()
            .map((b) => `${b.text} [${b.callback_data}]`)
            .join(', ')}`;
    const photo = message.photoPath === null ? '' : `\nФото: ${message.photoPath}`;
    console.warn(`[telegram] чат ${message.chatId}\n${message.text}${photo}${buttons}`);
  },
};

export const httpTelegramTransport: TelegramTransport = {
  async send(message: TelegramMessage): Promise<void> {
    const markup =
      message.buttons === null ? null : JSON.stringify({ inline_keyboard: message.buttons });

    if (message.photoPath === null) {
      await callApi(
        'sendMessage',
        JSON.stringify({
          chat_id: message.chatId,
          text: message.text.slice(0, TEXT_LIMIT),
          disable_web_page_preview: true,
          ...(markup === null ? {} : { reply_markup: markup }),
        }),
      );
      return;
    }

    const file = await readFile(message.photoPath);
    const form = new UndiciFormData();
    form.append('chat_id', message.chatId);
    form.append('caption', message.text.slice(0, CAPTION_LIMIT));
    form.append(
      'photo',
      new Blob([file]),
      message.photoPath.slice(message.photoPath.lastIndexOf('/') + 1),
    );
    if (markup !== null) form.append('reply_markup', markup);
    await callApi('sendPhoto', form);
  },
};

/**
 * Ответ на нажатие кнопки: без него Telegram крутит часики на кнопке минуту.
 * Текст всплывает подсказкой у нажавшего — он и есть подтверждение действия.
 */
export async function answerCallbackQuery(callbackId: string, text: string): Promise<void> {
  await callApi(
    'answerCallbackQuery',
    JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  );
}

/**
 * Правка отправленного сообщения: к тексту дописывается итог модерации, а
 * кнопки убираются. Так в чате видно, что отзыв уже разобран и кем именно —
 * иначе двое модераторов нажимают по очереди на одно и то же.
 */
export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
): Promise<void> {
  await callApi(
    'editMessageText',
    JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(0, TEXT_LIMIT),
      reply_markup: { inline_keyboard: [] },
    }),
  );
}

/** Кнопки модерации отзыва — docs/API.md §9. Обрабатывает их `/api/telegram/webhook`. */
function moderationButtons(reviewId: string): readonly (readonly InlineButton[])[] {
  return [
    [
      { text: '✅ Одобрить', callback_data: `rev:approve:${reviewId}` },
      { text: '🚫 Запретить', callback_data: `rev:reject:${reviewId}` },
      { text: '📦 Архив', callback_data: `rev:archive:${reviewId}` },
    ],
  ];
}

/**
 * Технически ли канал готов работать: транспорт не выключен, есть токен и
 * адресат. Это не то же самое, что выбор владельца в админке, — тот
 * приходит в `prefs` и проверяется отдельно.
 */
export function isTelegramConfigured(chatId: string | undefined): boolean {
  if (env.TELEGRAM_TRANSPORT === 'off') return false;
  if (env.NOTIFY_DRIVER === 'log') return true;
  const token = env.TELEGRAM_BOT_TOKEN;
  return token !== undefined && token !== '' && chatId !== undefined && chatId !== '';
}

export type TelegramChannelPrefs = {
  /** Выбор владельца в админке. */
  readonly enabled: boolean;
  /** Чат из настроек; пусто — берётся из окружения на уровне `prefs`. */
  readonly chatId: string | undefined;
};

export function createTelegramChannel(
  transport?: TelegramTransport,
  prefs: TelegramChannelPrefs = { enabled: true, chatId: env.TELEGRAM_CHAT_ID },
): NotificationChannel {
  return {
    name: 'telegram',
    // канал работает, только если владелец его выбрал и доступы на месте
    isEnabled: () => prefs.enabled && isTelegramConfigured(prefs.chatId),
    async send(payload: NotificationPayload): Promise<void> {
      const chosen =
        transport ?? (env.NOTIFY_DRIVER === 'log' ? logTelegramTransport : httpTelegramTransport);

      const photo = attachedPhoto(payload);
      const photoPath = photo === null ? null : resolveUploadPath(photo);

      await chosen.send({
        chatId: prefs.chatId ?? '(не задан)',
        text: notificationText(payload),
        photoPath,
        buttons: payload.kind === 'review' ? moderationButtons(payload.reviewId) : null,
      });
    },
  };
}
