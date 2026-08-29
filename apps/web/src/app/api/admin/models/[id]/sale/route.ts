/**
 * Скидка на модель — docs/API.md §3, ADR-011.
 *
 * 🔴 Задаётся конечной ценой и периодом. Процент вычисляется, а «старой ценой»
 * может быть только та, по которой товар действительно продавался.
 */
import { json, readJson, validationError, withOwner } from '@/server/http';
import { setSale } from '@/server/repo/products';
import { saleInputSchema } from '@/entities/product/sale';
import { revalidateCatalog } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const PATCH = withOwner(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const parsed = saleInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const product = await setSale(id, parsed.data);
  revalidateCatalog(product.slug);

  return json(product);
});
