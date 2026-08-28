import { randomUUID } from 'node:crypto';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import {
  LEAD_RATE_LIMIT,
  NO_STORE,
  assertWithinRateLimit,
  handleRouteError,
  json,
} from '@/server/http';
import { compactFormFields, leadFormSchema, readLeadContext } from '@/server/intake/schemas';
import { collectTracking } from '@/server/intake/tracking';
import { createLead } from '@/server/services/leads';
import { env } from '@/shared/config/env';

/**
 * Приём заявки с сайта — docs/API.md §8.
 *
 * Обработчик отвечает только за запрос: границу тела, ловушку для ботов,
 * частоту обращений, разбор формы и код ответа. Само обращение — правило, а
 * не запрос, и живёт в `services/leads` вместе с инвариантом 2 (ADR-142).
 */
const MAX_BODY_BYTES = env.UPLOAD_MAX_BYTES + 65_536;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readIntakeBody(request, MAX_BODY_BYTES);

    // Ловушка сработала — это бот. Отвечаем как при успехе, но ничего не пишем:
    // явный отказ подсказал бы автору спама, какое поле нужно оставить пустым.
    if (isHoneypotFilled(body)) {
      console.warn('Заявка отклонена: заполнено поле-ловушка');
      return json({ id: randomUUID() }, 201, NO_STORE);
    }

    await assertWithinRateLimit(request, 'leads', LEAD_RATE_LIMIT);

    const lead = await createLead({
      form: leadFormSchema.parse(compactFormFields(body.fields)),
      tracking: collectTracking(request, body.fields),
      /* Что человек делал на странице до формы: расчёт, подбор, модели.
         Приходит из браузера, поэтому разбирается схемой, а не принимается на
         веру, и никогда не мешает заявке дойти (docs/API.md §8). */
      context: readLeadContext(body.fields.context),
      photo: body.files.get('photo') ?? null,
    });

    return json({ id: lead.id }, 201, NO_STORE);
  } catch (error) {
    return handleRouteError(error);
  }
}
