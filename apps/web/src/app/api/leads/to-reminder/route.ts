import { randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import { errorResponse, jsonResponse, toApiError } from '@/server/intake/http';
import { LEAD_RATE_LIMIT, assertWithinRateLimit } from '@/server/intake/rate-limit';
import { TO_REMINDER_TOPIC, toReminderSchema } from '@/server/intake/schemas';
import { collectTracking } from '@/server/intake/tracking';
import { enqueueNotification } from '@/server/notifications/queue';

/**
 * Напоминание о сезонном ТО — docs/API.md §8.
 *
 * Форма спрашивает только телефон и давность установки, но это такое же
 * обращение: телефон — персональные данные, значит запись в базе и согласие
 * обязательны, а владелец узнаёт о нём через ту же очередь.
 */
const MAX_BODY_BYTES = 16_384;

/** Имя в списке заявок: форма напоминания его не спрашивает, а колонка не должна быть пустой. */
const TO_REMINDER_NAME = 'Напоминание о ТО';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readIntakeBody(request, MAX_BODY_BYTES);

    if (isHoneypotFilled(body)) {
      console.warn('Запрос напоминания отклонён: заполнено поле-ловушка');
      return jsonResponse({ id: randomUUID() }, 201);
    }

    await assertWithinRateLimit(request, 'leads', LEAD_RATE_LIMIT);

    const input = toReminderSchema.parse(body.fields);
    const tracking = collectTracking(request, body.fields);

    const lead = await db.lead.create({
      data: {
        name: TO_REMINDER_NAME,
        phone: input.phone,
        topic: TO_REMINDER_TOPIC,
        // «установили этим летом», «не помню, когда чистили» — это и есть срок,
        // от которого владелец считает, когда перезвонить
        comment: input.when ?? null,
        sourceUrl: tracking.sourceUrl,
        referrer: tracking.referrer,
        ...(tracking.utm === null ? {} : { utm: tracking.utm }),
        consentAt: new Date(),
      },
    });

    await enqueueNotification({
      kind: 'to-reminder',
      leadId: lead.id,
      phone: lead.phone,
      when: lead.comment,
    });

    return jsonResponse({ id: lead.id }, 201);
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
