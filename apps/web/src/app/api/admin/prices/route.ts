/**
 * Прайс монтажа и ставки допуслуг — docs/API.md §4.
 */
import { json, readJson, validationError, withOwner } from '@/server/http';
import { getPrices, replacePrices } from '@/server/repo/prices';
import { pricesUpdateSchema } from '@/entities/price/model';
import { revalidatePrices } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async () => json(await getPrices()));

export const PUT = withOwner(async (request) => {
  const parsed = pricesUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const result = await replacePrices(parsed.data);
  revalidatePrices();

  return json(result);
});
