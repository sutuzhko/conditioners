import { z } from 'zod';

import { json, notFound, readJson, withOwner } from '@/server/http';
import {
  findDeliveryTarget,
  setDeliveryEmail,
  unbindTelegramChatOf,
} from '@/server/repo/admin-users';

/**
 * Адреса доставки уведомлений по людям — docs/API.md §10.
 *
 * 🔴 Chat ID телеграма сюда прислать нельзя: его нельзя ввести руками, он
 * приходит от самого телеграма при привязке (`notifications/binding`). Здесь
 * есть только почта и снятие привязки — иначе владелец мог бы «привязать»
 * чужой чат числом, которое подсмотрел.
 *
 * Раздел владельца: монтажник свои адреса не правит через этот адрес.
 */
export const dynamic = 'force-dynamic';

const EMAIL_MAX = 200;

const emailField = z
  .string({ invalid_type_error: 'Адрес — это строка' })
  .trim()
  .max(EMAIL_MAX, { message: `Адрес длиннее ${EMAIL_MAX} символов не бывает` })
  // пустая строка — «адреса нет», а не ошибка: так его и стирают
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'Похоже, в адресе опечатка',
  });

const bodySchema = z
  .object({
    email: emailField.optional(),
    /** Снять привязку чата. Обратной операции здесь нет намеренно. */
    unbindTelegram: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => value.email !== undefined || value.unbindTelegram !== undefined, {
    message: 'Нечего сохранять',
  });

export const PATCH = withOwner(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const target = await findDeliveryTarget(id);
  if (target === null) return notFound('Сотрудник');

  const body = bodySchema.parse(await readJson(request));

  if (body.email !== undefined) await setDeliveryEmail(id, body.email);
  if (body.unbindTelegram === true) await unbindTelegramChatOf(id);

  const updated = await findDeliveryTarget(id);

  /* Наружу уходит факт привязки, а не сам идентификатор чата: показывать его
     незачем никому, а хранить в разметке панели — тем более. */
  return json({
    id,
    telegram: updated?.telegramChatId !== null && updated?.telegramChatId !== undefined,
    email: updated?.email ?? null,
  });
});
