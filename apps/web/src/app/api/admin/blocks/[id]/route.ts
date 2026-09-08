import { dayBlockUpdateSchema } from '@/entities/crm/model';
import { FIELD } from '@/entities/staff/access';
import { json, noContent, readJson, validationError, withRoles } from '@/server/http';
import { remove, update } from '@/server/repo/day-blocks';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * Правка занятости — телом заведения целиком.
 *
 * Частичной она не бывает: повтор, дата, день недели и окно связаны между
 * собой, и подмножество полей даёт комбинации, которые нечем истолковать.
 */
export const PATCH = withRoles(FIELD, async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = dayBlockUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update({ role: session.role, userId: session.userId }, id, parsed.data));
});

export const DELETE = withRoles(FIELD, async (_request, context: Context, session) => {
  const { id } = await context.params;

  await remove({ role: session.role, userId: session.userId }, id);
  return noContent();
});
