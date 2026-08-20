import { json, noContent, notFound, readJson, validationError, withAdmin } from '@/server/http';
import { findById, removePhoto, updatePhoto } from '@/server/repo/products';
import { photoPatchSchema } from '@/server/repo/validation';
import { deleteStoredImage } from '@/server/uploads';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; photoId: string }> };

export const PATCH = withAdmin(async (request, context: Context) => {
  const { id, photoId } = await context.params;

  const product = await findById(id);
  if (product === null) return notFound('Модель');

  const parsed = photoPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const photo = await updatePhoto(id, photoId, parsed.data);
  revalidateCatalog(product.slug);

  return json(photo);
});

export const DELETE = withAdmin(async (_request, context: Context) => {
  const { id, photoId } = await context.params;

  const product = await findById(id);
  if (product === null) return notFound('Модель');

  const stored = product.photos.find((photo) => photo.id === photoId);

  await removePhoto(id, photoId);
  if (stored !== undefined) await deleteStoredImage(stored.url);

  revalidateCatalog(product.slug);

  return noContent();
});
