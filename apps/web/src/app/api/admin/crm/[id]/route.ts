import { crmEventUpdateSchema } from '@/entities/crm/model';
import { json, noContent, readJson, validationError, withOwner } from '@/server/http';
import { remove, update } from '@/server/repo/crm';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** Перенос, правка и закрытие дела — одним маршрутом: меняется то, что прислали. */
export const PATCH = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = crmEventUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, parsed.data));
});

export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;
  await remove(id);
  return noContent();
});
