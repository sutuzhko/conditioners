/**
 * Пункт чеклиста — docs/API.md §13.
 *
 * Отмечает при сборах и владелец, и монтажник: это один список на выезд.
 * Удалить можно только дописанный пункт — собранный из наряда вернётся первой
 * же пересборкой (разбор в `repo/order-files`).
 */
import { checklistItemUpdateSchema } from '@/entities/order/model';
import { FIELD } from '@/entities/staff/access';
import { json, noContent, readJson, validationError, withRoles } from '@/server/http';
import { removeChecklistItem, setChecklistDone } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = withRoles(FIELD, async (request, context: Context, session) => {
  const { id, itemId } = await context.params;

  const parsed = checklistItemUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const viewer = { role: session.role, userId: session.userId };

  return json(await setChecklistDone(id, itemId, viewer, parsed.data.done));
});

export const DELETE = withRoles(FIELD, async (_request, context: Context, session) => {
  const { id, itemId } = await context.params;

  await removeChecklistItem(id, itemId, { role: session.role, userId: session.userId });

  return noContent();
});
