/**
 * Обложка статьи — docs/API.md §6.
 */
import { apiError, json, notFound, withOwner } from '@/server/http';
import { findById, setCover } from '@/server/repo/articles';
import { deleteStoredImage, saveImage } from '@/server/uploads/store';
import { revalidateArticles } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const POST = withOwner(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const article = await findById(id);
  if (article === null) return notFound('Статья', 'f');

  const form = await request.formData();
  /* Поле по контракту — `cover`, `photo` принимается синонимом: так его шлёт
     общий компонент загрузки. В ошибку уезжает то имя, которым файл прислали,
     иначе клиент подсветит не то поле; не прислали вовсе — каноническое. */
  const cover = form.get('cover');
  const photo = form.get('photo');
  const file = cover ?? photo;
  const field = cover === null && photo !== null ? 'photo' : 'cover';
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл изображения', { field });
  }

  const stored = await saveImage(file, field);

  /* Файл уже на диске, а запись в БД ещё нет: упала — снимок остаётся сиротой,
     которого больше никто не найдёт. Публичные формы так за собой убирают
     давно (ADR-091), админские загрузки оставались без компенсации. */
  const updated = await setCover(id, stored.url).catch(async (error: unknown) => {
    await deleteStoredImage(stored.url);
    throw error;
  });

  // Прежняя обложка больше нигде не используется — оставлять её на диске незачем.
  if (article.cover !== null) await deleteStoredImage(article.cover);
  revalidateArticles(updated.slug);

  return json({ cover: updated.cover });
});
