/**
 * Правка и удаление записи о технике — docs/API.md §12.
 *
 * Номер записи сверяется с клиентом в репозитории: без этого чужую технику
 * можно было бы править по угаданному номеру.
 */
import { clientUnitUpdateSchema } from '@/entities/client/model';
import { json, noContent, readJson, validationError, withOwner } from '@/server/http';
import { remove, update } from '@/server/repo/client-units';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; unitId: string }> };

export const PATCH = withOwner(async (request, context: Context) => {
  const { id, unitId } = await context.params;

  const parsed = clientUnitUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, unitId, parsed.data));
});

export const DELETE = withOwner(async (_request, context: Context) => {
  const { id, unitId } = await context.params;

  await remove(id, unitId);
  return noContent();
});
