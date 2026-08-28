import { noContent, withOwner } from '@/server/http';
import { remove } from '@/server/repo/reviews';
import { deleteStoredImage } from '@/server/uploads/store';
import { revalidateReviews } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

/** Удаление безвозвратно: восстановления в контракте нет (docs/API.md §7). */
export const DELETE = withOwner(async (_request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const files = await remove(id);
  /* 🔴 Снимки — персональные данные: фотография человека не должна жить на
     диске после безвозвратного удаления отзыва (152-ФЗ; аудит, BUGS).
     Модели и статьи чистят файлы так же — отзывы были единственным пропуском. */
  await Promise.all(
    [files.photo, files.avatar]
      .filter((url): url is string => url !== null)
      .map((url) => deleteStoredImage(url)),
  );
  revalidateReviews();

  return noContent();
});
