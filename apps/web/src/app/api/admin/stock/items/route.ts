/**
 * Справочник позиций склада — docs/API.md §14.
 *
 * Номенклатуру заводит владелец (инвариант 8): кодом задан только набор
 * единиц измерения, а что именно лежит в гараже, решает он сам.
 */
import { stockItemCreateSchema } from '@/entities/stock/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { createItem } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

export const POST = withOwner(async (request, _context, session) => {
  const parsed = stockItemCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await createItem(parsed.data, { role: session.role, userId: session.userId }), 201);
});
