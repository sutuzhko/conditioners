import { randomUUID } from 'node:crypto';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import {
  LEAD_RATE_LIMIT,
  NO_STORE,
  assertWithinRateLimit,
  handleRouteError,
  json,
} from '@/server/http';
import { compactFormFields, toReminderFormSchema } from '@/server/intake/schemas';
import { collectTracking } from '@/server/intake/tracking';
import { createToReminder } from '@/server/services/leads';

/**
 * Напоминание о сезонном ТО — docs/API.md §8.
 *
 * Форма другая, обращение то же самое: запись и уведомление собирает тот же
 * сервис, что и заявку (`services/leads`, ADR-142). Здесь — только разбор
 * запроса.
 */
const MAX_BODY_BYTES = 16_384;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readIntakeBody(request, MAX_BODY_BYTES);

    if (isHoneypotFilled(body)) {
      console.warn('Запрос напоминания отклонён: заполнено поле-ловушка');
      return json({ id: randomUUID() }, 201, NO_STORE);
    }

    await assertWithinRateLimit(request, 'leads', LEAD_RATE_LIMIT);

    const lead = await createToReminder({
      form: toReminderFormSchema.parse(compactFormFields(body.fields)),
      tracking: collectTracking(request),
    });

    return json({ id: lead.id }, 201, NO_STORE);
  } catch (error) {
    return handleRouteError(error);
  }
}
