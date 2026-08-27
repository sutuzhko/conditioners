/**
 * Зона хранения — docs/API.md §14. Правит и сдаёт в архив только владелец:
 * машина закрепляется за человеком, а это решение о команде, а не о складе.
 */
import { stockZoneUpdateSchema } from '@/entities/stock/model';
import { json, noContent, readJson, validationError, withOwner } from '@/server/http';
import { archiveZone, updateZone } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = stockZoneUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await updateZone(id, parsed.data));
});

/** Архивирование, а не удаление: движения по зоне остаются в журнале. */
export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  await archiveZone(id);

  return noContent();
});
