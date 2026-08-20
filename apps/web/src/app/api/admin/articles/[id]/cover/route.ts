/**
 * Обложка статьи — docs/API.md §6.
 */
import { apiError, json, notFound, withAdmin } from '@/server/http';
import { findById, setCover } from '@/server/repo/articles';
import { deleteStoredImage, saveImage } from '@/server/uploads';
import { revalidateArticles } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const article = await findById(id);
  if (article === null) return notFound('Статья');

  const form = await request.formData();
  const file = form.get('cover') ?? form.get('photo');
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл изображения', { field: 'cover' });
  }

  const stored = await saveImage(file);
  const updated = await setCover(id, stored.url);

  // Прежняя обложка больше нигде не используется — оставлять её на диске незачем.
  if (article.cover !== null) await deleteStoredImage(article.cover);
  revalidateArticles(updated.slug);

  return json({ cover: updated.cover });
});
