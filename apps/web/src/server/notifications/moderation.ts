import { z } from 'zod';

/**
 * Разбор обновлений от Telegram — docs/API.md §7 и §10.
 *
 * Вынесено из маршрута, потому что это чистая логика: строка `callback_data`
 * пришла снаружи, и доверять ей нельзя ровно так же, как телу запроса.
 */

/** Строка кнопки: `rev:approve:<id>` — её формирует канал Telegram. */
const CALLBACK_PATTERN = /^rev:(approve|reject|archive):([A-Za-z0-9_-]{1,64})$/;

/** Что именно нажали: статус отзыва и подпись для чата. */
export type ModerationCommand = {
  readonly reviewId: string;
  readonly status: 'approved' | 'rejected' | 'archived';
  /** Итог, который дописывается к сообщению и всплывает подсказкой. */
  readonly outcome: string;
};

const OUTCOMES: Record<ModerationCommand['status'], string> = {
  approved: 'Одобрено — отзыв опубликован',
  rejected: 'Отклонено — отзыв не появится на сайте',
  archived: 'В архиве — отзыв убран из работы',
};

const ACTIONS: Record<string, ModerationCommand['status']> = {
  approve: 'approved',
  reject: 'rejected',
  archive: 'archived',
};

/**
 * Причина отказа, нажатого в Telegram.
 *
 * 🔴 Кнопка в чате причину собрать не может: у неё нет поля ввода, а сессии
 * панели за ней не стоит. Отказ при этом обязан быть объяснён (ADR-300) — и
 * запись говорит ровно то, что произошло: причины не написали, нажали кнопку,
 * нажал вот этот человек. Придумывать за него настоящую причину нельзя,
 * оставить пусто — значит вернуть отказ без следа.
 *
 * Одним нажатием отказ остаётся намеренно: если сделать его дороже соседних
 * кнопок, владелец начнёт отправлять в архив то, что хотел отклонить, и
 * сигнал пропадёт совсем.
 */
export function telegramRejectReason(name: string): string {
  return `Отклонено кнопкой в Telegram — ${name}. Причина не записана.`;
}

/** Разбор `callback_data`. Чужая или испорченная строка — `null`, а не ошибка. */
export function parseModerationCommand(data: string | undefined): ModerationCommand | null {
  if (data === undefined) return null;

  const match = CALLBACK_PATTERN.exec(data);
  if (match === null) return null;

  const status = ACTIONS[match[1] ?? ''];
  const reviewId = match[2];
  if (status === undefined || reviewId === undefined) return null;

  return { reviewId, status, outcome: OUTCOMES[status] };
}

/**
 * Тело обновления от Telegram. Описываем только то, что читаем: остальные
 * поля Bot API нам неинтересны и меняются от версии к версии.
 */
const senderSchema = z.object({
  first_name: z.string().optional(),
  username: z.string().optional(),
});

export const telegramUpdateSchema = z.object({
  /** Сообщение в чат: им человек привязывает свой телеграм к учётной записи. */
  message: z
    .object({
      message_id: z.number(),
      text: z.string().optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
      from: senderSchema.optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().optional(),
      from: senderSchema.optional(),
      message: z
        .object({
          message_id: z.number(),
          text: z.string().optional(),
          caption: z.string().optional(),
          chat: z.object({ id: z.union([z.number(), z.string()]) }),
        })
        .optional(),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

/** Кто нажал: имя или ник. Не представился — так и пишем. */
export type TelegramSender = z.infer<typeof senderSchema>;

/** Сообщение в чат — то, из чего берётся адрес привязки. */
export type TelegramChatMessage = NonNullable<TelegramUpdate['message']>;

export function moderatorName(from: TelegramSender | undefined): string {
  const name = from?.first_name?.trim();
  if (name !== undefined && name !== '') return name;

  const username = from?.username?.trim();
  return username !== undefined && username !== '' ? `@${username}` : 'модератор';
}
