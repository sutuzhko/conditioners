/**
 * Загрузка фотографии модели — docs/API.md §3.
 */
import { apiError, json, notFound, withAdmin } from '@/server/http';
import { addPhoto, findById } from '@/server/repo/products';
import { deleteStoredImage, saveImage } from '@/server/uploads/store';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const product = await findById(id);
  if (product === null) return notFound('Модель', 'f');

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл изображения', { field: 'photo' });
  }

  const alt = form.get('alt');
  const stored = await saveImage(file, 'photo');

  /* Файл уже на диске, а записи о нём ещё нет: упала вставка — снимок
     остаётся сиротой, которого больше никто не найдёт. Публичные формы так за
     собой убирают давно (ADR-091), админские загрузки оставались без
     компенсации. */
  const photo = await addPhoto(id, {
    url: stored.url,
    alt: typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : null,
  }).catch(async (error: unknown) => {
    await deleteStoredImage(stored.url);
    throw error;
  });

  revalidateCatalog(product.slug);

  return json(photo, 201);
});
