/**
 * Смена статуса отзыва — docs/API.md §7.
 *
 * 🔴 Тело запроса описано строгой схемой: попытка передать `text`, `name` или
 * `rating` заканчивается 400, а не молчаливым игнорированием. Редактируемый
 * отзыв — не отзыв (инвариант 7).
 *
 * 🔴 При отказе схема требует `reason` (ADR-300). Причина инварианту 7 не
 * противоречит: она про решение модератора, а не про слова автора.
 *
 * 🔴 Порядок записей обработчику не принадлежит (ADR-142): смена статуса и
 * событие журнала неразделимы, и держит их одна транзакция в сервисе. Здесь
 * остаётся то, что про запрос, — разбор тела, доступ и код ответа.
 */
import { json, readJson, validationError, withOwner } from '@/server/http';
import { moderateReview } from '@/server/services/review-moderation';
import { reviewModerationSchema } from '@/entities/review/model';
import { revalidateReviews } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const PATCH = withOwner(
  async (request, context: { params: Promise<{ id: string }> }, session) => {
    const { id } = await context.params;

    const parsed = reviewModerationSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    const review = await moderateReview({
      id,
      moderation: parsed.data,
      actorId: session.userId,
    });
    revalidateReviews();

    return json(review);
  },
);
