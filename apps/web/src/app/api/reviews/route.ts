import { randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { isHoneypotFilled, readIntakeBody } from '@/server/intake/body';
import { errorResponse, jsonResponse, toApiError } from '@/server/intake/http';
import { REVIEW_RATE_LIMIT, assertWithinRateLimit } from '@/server/intake/rate-limit';
import { reviewSchema } from '@/server/intake/schemas';
import { storeImage } from '@/server/intake/uploads';
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
      return jsonResponse({ id: randomUUID() }, 201);
    }

    await assertWithinRateLimit(request, 'reviews', REVIEW_RATE_LIMIT);

    const input = reviewSchema.parse(body.fields);

    const file = body.files.get('photo');
    const photo = file === undefined ? null : (await storeImage(file, 'reviews')).url;

    const review = await db.review.create({
      data: {
        name: input.name,
        district: input.district ?? null,
        rating: input.rating,
        text: input.text,
        photo,
      },
    });

    await enqueueNotification({
      kind: 'review',
      reviewId: review.id,
      name: review.name,
      district: review.district,
      rating: review.rating,
      text: review.text,
      photo: review.photo,
    });

    return jsonResponse({ id: review.id }, 201);
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
