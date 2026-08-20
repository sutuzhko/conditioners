/**
 * Смена статуса отзыва — docs/API.md §7.
 *
 * 🔴 Тело запроса описано строгой схемой ровно с одним полем `status`:
 * попытка передать `text`, `name` или `rating` заканчивается 400, а не молчаливым
 * игнорированием. Редактируемый отзыв — не отзыв (инвариант 7).
 */
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { setStatus } from '@/server/repo/reviews';
import { reviewStatusSchema } from '@/server/repo/validation';
import { revalidateReviews } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const PATCH = withAdmin(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const parsed = reviewStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const review = await setStatus(id, parsed.data.status);
  revalidateReviews();

  return json(review);
});
