/**
 * Каталог в админке — docs/API.md §3.
 */
import { json, readJson, validationError, withOwner } from '@/server/http';
import { create, listAll } from '@/server/repo/products';
import { productInputSchema } from '@/entities/product/model';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async () => json(await listAll()));

export const POST = withOwner(async (request) => {
  const parsed = productInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const product = await create(parsed.data);
  revalidateCatalog(product.slug);

  return json(product, 201);
});
