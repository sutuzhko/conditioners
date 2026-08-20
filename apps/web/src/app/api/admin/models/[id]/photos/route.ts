/**
 * Загрузка фотографии модели — docs/API.md §3.
 */
import { apiError, json, notFound, withAdmin } from '@/server/http';
import { addPhoto, findById } from '@/server/repo/products';
import { saveImage } from '@/server/uploads/store';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  const product = await findById(id);
  if (product === null) return notFound('Модель');

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл изображения', { field: 'photo' });
  }

  const alt = form.get('alt');
  const stored = await saveImage(file);
  const photo = await addPhoto(id, {
    url: stored.url,
    alt: typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : null,
  });

  revalidateCatalog(product.slug);

  return json(photo, 201);
});
