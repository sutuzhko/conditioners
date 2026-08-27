/**
 * Пункт чеклиста — docs/API.md §13.
 *
 * Отмечает при сборах и владелец, и монтажник: это один список на выезд.
 * Удалить можно только дописанный пункт — собранный из наряда вернётся первой
 * же пересборкой (разбор в `repo/order-files`).
 */
import { checklistItemUpdateSchema } from '@/entities/order/model';
import { json, noContent, readJson, validationError, withAdmin } from '@/server/http';
import { removeChecklistItem, setChecklistDone } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = withAdmin(async (request, context: Context, session) => {
  const { id, itemId } = await context.params;

  const parsed = checklistItemUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const viewer = { role: session.role, userId: session.userId };

  return json(await setChecklistDone(id, itemId, viewer, parsed.data.done));
});

export const DELETE = withAdmin(async (_request, context: Context, session) => {
  const { id, itemId } = await context.params;

  await removeChecklistItem(id, itemId, { role: session.role, userId: session.userId });

  return noContent();
});
