/**
 * Смена статуса отзыва — docs/API.md §7.
 *
 * 🔴 Тело запроса описано строгой схемой: попытка передать `text`, `name` или
 * `rating` заканчивается 400, а не молчаливым игнорированием. Редактируемый
 * отзыв — не отзыв (инвариант 7).
 *
 * 🔴 При отказе схема требует `reason` (ADR-300). Причина инварианту 7 не
 * противоречит: она про решение модератора, а не про слова автора.
 */
import { json, readJson, validationError, withOwner } from '@/server/http';
import { setStatus } from '@/server/repo/reviews';
import { reviewModerationSchema } from '@/entities/review/model';
import { revalidateReviews } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const PATCH = withOwner(
  async (request, context: { params: Promise<{ id: string }> }, session) => {
    const { id } = await context.params;

    const parsed = reviewModerationSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    const review = await setStatus(id, parsed.data, session.userId);
    revalidateReviews();

    return json(review);
  },
);
