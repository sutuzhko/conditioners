import { randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import {
  LEAD_RATE_LIMIT,
  NO_STORE,
  assertWithinRateLimit,
  handleRouteError,
  json,
} from '@/server/http';
import {
  DEFAULT_LEAD_TOPIC,
  compactFormFields,
  leadFormSchema,
  normalizePhone,
} from '@/server/intake/schemas';
import { collectTracking } from '@/server/intake/tracking';
import { deleteStoredImage, saveImage } from '@/server/uploads/store';
import { enqueueNotification } from '@/server/notifications/queue';
import { env } from '@/shared/config/env';

/**
 * Приём заявки с сайта — docs/API.md §8.
 *
 * 🔴 Порядок обработки жёсткий (инвариант 2): валидация → запись `Lead` →
 * постановка `Notification` в очередь → `201`. Ответ клиенту не ждёт ни
 * Telegram, ни SMTP: недоступность внешнего сервиса не может стоить владельцу
 * заявки.
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

    const input = leadFormSchema.parse(compactFormFields(body.fields));
    const tracking = collectTracking(request, body.fields);

    const file = body.files.get('photo');
    const photo = file === undefined ? null : (await saveImage(file, 'photo')).url;

    // 🔴 Заявка и уведомление о ней — одна транзакция (ADR-091): падение между
    // двумя записями оставляло заявку, о которой владелец не узнал бы никогда.
    // Упала вставка — сохранённый файл остаётся сиротой на диске, чистим его.
    const lead = await db
      .$transaction(async (tx) => {
        const created = await tx.lead.create({
          data: {
            name: input.name,
            phone: normalizePhone(input.phone),
            // форма темы может не спрашивать — тогда это обращение за консультацией
            topic: input.topic ?? DEFAULT_LEAD_TOPIC,
            place: input.place ?? null,
            qty: input.qty ?? null,
            callTime: input.callTime ?? null,
            address: input.address ?? null,
            comment: input.comment ?? null,
            photo,
            sourceUrl: tracking.sourceUrl,
            referrer: tracking.referrer,
            // без меток поле остаётся NULL, а не пустым объектом — в админке это разные вещи
            ...(tracking.utm === null ? {} : { utm: tracking.utm }),
            // 🔴 доказательство согласия по 152-ФЗ: фиксируем момент отправки формы
            consentAt: new Date(),
          },
        });

        await enqueueNotification(
          {
            kind: 'lead',
            leadId: created.id,
            name: created.name,
            phone: created.phone,
            topic: created.topic,
            place: created.place,
            qty: created.qty,
            callTime: created.callTime,
            address: created.address,
            comment: created.comment,
            photo: created.photo,
            sourceUrl: created.sourceUrl,
          },
          tx,
        );

        return created;
      })
      .catch(async (error: unknown) => {
        if (photo !== null) await deleteStoredImage(photo);
        throw error;
      });

    return json({ id: lead.id }, 201, NO_STORE);
  } catch (error) {
    return handleRouteError(error);
  }
}
