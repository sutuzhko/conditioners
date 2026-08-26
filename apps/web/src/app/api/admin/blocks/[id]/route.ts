import { dayBlockUpdateSchema } from '@/entities/crm/model';
import { json, noContent, readJson, validationError, withAdmin } from '@/server/http';
import { remove, update } from '@/server/repo/day-blocks';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * Правка занятости — телом заведения целиком.
 *
 * Частичной она не бывает: повтор, дата, день недели и окно связаны между
 * собой, и подмножество полей даёт комбинации, которые нечем истолковать.
 */
export const PATCH = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = dayBlockUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update({ role: session.role, userId: session.userId }, id, parsed.data));
});

export const DELETE = withAdmin(async (_request, context: Context, session) => {
  const { id } = await context.params;

  await remove({ role: session.role, userId: session.userId }, id);
  return noContent();
});
