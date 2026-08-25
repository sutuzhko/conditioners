import { NO_STORE, json } from '@/server/http';
import { answerCallbackQuery, editMessageText } from '@/server/notifications/channels/telegram';
import {
  moderatorName,
  parseModerationCommand,
  telegramUpdateSchema,
} from '@/server/notifications/moderation';
import { setStatus } from '@/server/repo/reviews';
import { revalidateReviews } from '@/server/revalidate';
import { env } from '@/shared/config/env';
import { safeEqual } from '@/server/auth';

/**
 * Приём нажатий на кнопки модерации из Telegram — docs/API.md §7.
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
  const query = parsed.success ? parsed.data.callback_query : undefined;
  if (query === undefined) {
    // не наше обновление (сообщение в чат, вступление в группу) — молча принимаем
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
