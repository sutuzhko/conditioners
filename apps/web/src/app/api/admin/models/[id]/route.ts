import { json, noContent, notFound, readJson, validationError, withAdmin } from '@/server/http';
import { findById, remove, update } from '@/server/repo/products';
import { deleteStoredImage } from '@/server/uploads/store';
import { productInputSchema, productPatchSchema } from '@/entities/product/model';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withAdmin(async (_request, context: Context) => {
  const { id } = await context.params;
  const product = await findById(id);
  return product === null ? notFound('Модель', 'f') : json(product);
});

/** PUT заменяет карточку целиком, PATCH правит отдельные поля. */
export const PUT = withAdmin(async (request, context: Context) => {
  const { id } = await context.params;
  const parsed = productInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const before = await findById(id);
  if (before === null) return notFound('Модель', 'f');

  const product = await update(id, parsed.data);
  revalidateCatalog();

  return json(product);
});

export const PATCH = withAdmin(async (request, context: Context) => {
  const { id } = await context.params;
  const parsed = productPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const before = await findById(id);
  if (before === null) return notFound('Модель', 'f');

  const product = await update(id, parsed.data);
  revalidateCatalog();

  return json(product);
});

export const DELETE = withAdmin(async (_request, context: Context) => {
  const { id } = await context.params;

  const product = await findById(id);
  if (product === null) return notFound('Модель', 'f');

  await remove(id);
  // Файлы удаляются вместе с карточкой: том не должен копить осиротевшие фото.
  await Promise.all(product.photos.map((photo) => deleteStoredImage(photo.url)));

  revalidateCatalog();

  return noContent();
});
