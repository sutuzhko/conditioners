/**
 * Групповое назначение монтажника — docs/API.md §13.
 *
 * 🔴 Только владельцу: назначение исполнителя — его решение, и монтажник,
 * раздающий себе чужие выезды, ломает и график, и деньги (CRM.md §6, ADR-092).
 *
 * Обработчик здесь — контроллер (ADR-142): тело запроса, схема и код ответа.
 * Что происходит с нарядами и в каком порядке, знает `server/services`.
 */
import { z } from 'zod';

import { json, readJson, validationError, withOwner } from '@/server/http';
import { assignMany } from '@/server/services/order-assign';

export const dynamic = 'force-dynamic';

/**
 * Потолок пачки. Пятьдесят — это шесть страниц списка по восемь строк: больше
 * владелец за один раз не выбирает, а без потолка один запрос уводил бы
 * приложение в сотни записей истории и столько же уведомлений.
 */
const MAX_IDS = 50;

const assignSchema = z
  .object({
    ids: z
      .array(z.string().trim().min(1))
      .min(1, { message: 'Отметьте наряды галочками' })
      .max(MAX_IDS, { message: 'За один раз назначается не больше пятидесяти нарядов' }),
    installerId: z.string({ required_error: 'Выберите монтажника' }).trim().min(1, {
      message: 'Выберите монтажника',
    }),
  })
  .strict();

export const POST = withOwner(async (request, _context, session) => {
  const parsed = assignSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  /* Повторы убираются здесь, а не в сервисе: один и тот же наряд, выбранный
     дважды, — это одна работа, и вторая запись истории про неё лишняя. */
  const ids = [...new Set(parsed.data.ids)];

  return json(await assignMany(ids, parsed.data.installerId, session.userId));
});
