import { noContent, withAdmin } from '@/server/http';
import { remove } from '@/server/repo/reviews';
import { revalidateReviews } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

/** Удаление безвозвратно: восстановления в контракте нет (docs/API.md §7). */
export const DELETE = withAdmin(async (_request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  await remove(id);
  revalidateReviews();

  return noContent();
});
