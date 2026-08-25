import { randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import {
  REVIEW_RATE_LIMIT,
  NO_STORE,
  assertWithinRateLimit,
  handleRouteError,
  json,
} from '@/server/http';
import { compactFormFields, reviewFormSchema } from '@/server/intake/schemas';
import { saveImage } from '@/server/uploads/store';
import { enqueueNotification } from '@/server/notifications/queue';
import { env } from '@/shared/config/env';

/**
 * Приём отзыва с сайта — docs/API.md §7. Отзыв создаётся со статусом `PENDING`
 * и ждёт модерации: из админки или кнопками в Telegram.
 *
 * 🔴 Текст отзыва после этого не меняется никогда и никем (инвариант 7) —
 * эндпоинтов правки текста в проекте нет.
 */
const MAX_BODY_BYTES = env.UPLOAD_MAX_BYTES + 65_536;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readIntakeBody(request, MAX_BODY_BYTES);

    if (isHoneypotFilled(body)) {
      console.warn('Отзыв отклонён: заполнено поле-ловушка');
      return json({ id: randomUUID() }, 201, NO_STORE);
    }

    await assertWithinRateLimit(request, 'reviews', REVIEW_RATE_LIMIT);

    const input = reviewFormSchema.parse(compactFormFields(body.fields));

    /* Два снимка приходят раздельно: место установки и сам автор. Порядок
       сохранения последовательный — параллельная запись двух файлов ничего не
       ускоряет, а ошибку второй делает труднее объяснимой. */
    const photoFile = body.files.get('photo');
    const photo = photoFile === undefined ? null : (await saveImage(photoFile)).url;

    const avatarFile = body.files.get('avatar');
    const avatar = avatarFile === undefined ? null : (await saveImage(avatarFile)).url;

    // 🔴 Отзыв и уведомление о нём — одна транзакция (ADR-091): падение между
    // двумя записями оставляло отзыв, застрявший вне очереди модерации
    const review = await db.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          name: input.name,
          rating: input.rating,
          text: input.text,
          photo,
          avatar,
          // 🔴 доказательство согласия по 152-ФЗ: фиксируем момент отправки формы
          consentAt: new Date(),
        },
      });

      await enqueueNotification(
        {
          kind: 'review',
          reviewId: created.id,
          name: created.name,
          rating: created.rating,
          text: created.text,
          photo: created.photo,
        },
        tx,
      );

      return created;
    });

    return json({ id: review.id }, 201, NO_STORE);
  } catch (error) {
    return handleRouteError(error);
  }
}
