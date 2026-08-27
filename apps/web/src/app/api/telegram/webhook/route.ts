import { NO_STORE, json } from '@/server/http';
import {
  answerCallbackQuery,
  editMessageText,
  sendChatMessage,
} from '@/server/notifications/channels/telegram';
import {
  bindingReplies,
  parseChatCommand,
  verifyBindingCode,
} from '@/server/notifications/binding';
import {
  moderatorName,
  parseModerationCommand,
  telegramUpdateSchema,
  type TelegramChatMessage,
} from '@/server/notifications/moderation';
import {
  bindTelegramChat,
  listDeliveryTargets,
  unbindTelegramChat,
} from '@/server/repo/admin-users';
import { setStatus } from '@/server/repo/reviews';
import { revalidateReviews } from '@/server/revalidate';
import { env } from '@/shared/config/env';
import { safeEqual } from '@/server/auth';

/**
 * Приём обновлений из Telegram: кнопки модерации отзыва (docs/API.md §7) и
 * команды привязки чата к учётной записи (§10).
 *
 * 🔴 Единственная защита этого адреса — секрет, который Telegram шлёт
 * заголовком `X-Telegram-Bot-Api-Secret-Token`. Он же задаётся при
 * `setWebhook`. Не совпал — 404: страница «не существует» не сообщает
 * тому, кто её нащупал, что он был близок.
 *
 * 🔴 Ответ всегда 200 при верном секрете, даже если внутри что-то не вышло:
 * на ошибку Telegram повторяет доставку с нарастающей задержкой, и очередь
 * обновлений встаёт целиком. Что именно не получилось — пишем в лог и
 * говорим модератору подсказкой в чате.
 */
export const dynamic = 'force-dynamic';

/** Тело обновления мало: всё, что больше, к нашим кнопкам отношения не имеет. */
const MAX_BODY_BYTES = 32_768;

function secretMatches(request: Request): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  // секрет не задан — вебхук выключен: принимать команды «от кого угодно» нельзя
  if (expected === undefined || expected === '') return false;

  const presented = request.headers.get('x-telegram-bot-api-secret-token');
  // сравнение постоянного времени — как у любого секрета в проекте (аудит, BUGS)
  return presented !== null && safeEqual(presented, expected);
}

export async function POST(request: Request): Promise<Response> {
  if (!secretMatches(request)) {
    return json({ error: { code: 'not_found', message: 'Не найдено' } }, 404, NO_STORE);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    console.warn('Обновление Telegram отброшено: слишком большое тело');
    return json({ ok: true }, 200, NO_STORE);
  }

  // битый JSON — не наше обновление: 500 заставил бы Telegram ретраить его
  // вечно и стопорить очередь обновлений вместе с кнопками модерации
  let body: unknown = null;
  try {
    body = JSON.parse(raw === '' ? '{}' : raw);
  } catch {
    console.warn('Обновление Telegram отброшено: тело не разбирается как JSON');
    return json({ ok: true }, 200, NO_STORE);
  }

  const parsed = telegramUpdateSchema.safeParse(body);
  const update = parsed.success ? parsed.data : undefined;

  const chatMessage = update?.message;
  if (chatMessage !== undefined) {
    await bindChat(chatMessage);
    return json({ ok: true }, 200, NO_STORE);
  }

  const query = update?.callback_query;
  if (query === undefined) {
    // не наше обновление (вступление в группу, правка сообщения) — молча принимаем
    return json({ ok: true }, 200, NO_STORE);
  }

  const command = parseModerationCommand(query.data);
  if (command === null) {
    await safely(() => answerCallbackQuery(query.id, 'Неизвестная команда'));
    return json({ ok: true }, 200, NO_STORE);
  }

  try {
    await setStatus(command.reviewId, command.status);
    revalidateReviews();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Модерация из Telegram не удалась (${command.reviewId}): ${reason}`);
    await safely(() => answerCallbackQuery(query.id, 'Не получилось — откройте админку'));
    return json({ ok: true }, 200, NO_STORE);
  }

  await safely(() => answerCallbackQuery(query.id, command.outcome));

  const message = query.message;
  if (message !== undefined) {
    const original = message.text ?? message.caption ?? '';
    const footer = `\n\n— ${command.outcome} (${moderatorName(query.from)})`;
    await safely(() => editMessageText(message.chat.id, message.message_id, original + footer));
  }

  return json({ ok: true }, 200, NO_STORE);
}

/**
 * Вызов Bot API, который не имеет права уронить обработку: статус отзыва уже
 * изменён, и повторная доставка обновления поменяла бы его ещё раз.
 */
async function safely(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Ответ в Telegram не отправлен: ${reason}`);
  }
}

/**
 * Привязка чата к учётной записи по коду из панели.
 *
 * 🔴 Учётную запись выбирает не человек в чате, а код: чужой код подобрать
 * нельзя, а свой виден только тому, кто вошёл в панель (`notifications/binding`).
 * Поэтому проверка идёт перебором учётных записей — их у малого бизнеса
 * единицы, и это дешевле, чем хранить одноразовые коды в базе.
 *
 * Отключённая учётная запись привязки не получает: у неё и входа-то нет.
 */
async function bindChat(message: TelegramChatMessage): Promise<void> {
  const command = parseChatCommand(message.text);
  if (command === null) return;

  const chatId = String(message.chat.id);
  const reply = (text: string): Promise<void> => safely(() => sendChatMessage(chatId, text));

  if (command.kind === 'help') {
    await reply(bindingReplies.help);
    return;
  }

  try {
    if (command.kind === 'unbind') {
      const names = await unbindTelegramChat(chatId);
      await reply(names.length === 0 ? bindingReplies.notBound : bindingReplies.unbound);
      return;
    }

    const targets = await listDeliveryTargets();
    const target = targets.find(
      (candidate) => candidate.active && verifyBindingCode(candidate.id, command.code),
    );

    if (target === undefined) {
      await reply(bindingReplies.unknownCode);
      return;
    }

    await bindTelegramChat(target.id, chatId);
    await reply(bindingReplies.bound(target.name));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Привязка чата Telegram не удалась: ${reason}`);
    await reply(bindingReplies.unknownCode);
  }
}
