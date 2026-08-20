/**
 * Каталог в админке — docs/API.md §3.
 */
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { create, listAll } from '@/server/repo/products';
import { productCreateSchema } from '@/server/repo/validation';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => json(await listAll()));

export const POST = withAdmin(async (request) => {
  const parsed = productCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const product = await create(parsed.data);
  revalidateCatalog(product.slug);

  return json(product, 201);
});
