/**
 * Чеклист выезда — docs/API.md §13, разбор — docs/CRM.md §3.3.
 *
 * Открыт обеим ролям: список сборов ведёт тот, кто собирается. Что монтажник
 * видит только свой наряд, решает репозиторий — там же, где стоит фильтр по
 * исполнителю (CRM.md §6).
 */
import { checklistItemCreateSchema } from '@/entities/order/model';
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { addChecklistItem, rebuildChecklist } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** Свой пункт: то, что человек дописывает к собранному списку. */
export const POST = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = checklistItemCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const viewer = { role: session.role, userId: session.userId };

  return json(await addChecklistItem(id, viewer, parsed.data.text), 201);
});

/**
 * Пересборка по данным наряда.
 *
 * `PUT` на список, а не `POST` на действие: пересборка приводит чеклист к
 * тому, что говорит наряд, — это замена коллекции, а не новое событие.
 * 🔴 Отметки при сборах и дописанные пункты она сохраняет.
 */
export const PUT = withAdmin(async (_request, context: Context, session) => {
  const { id } = await context.params;

  return json(await rebuildChecklist(id, { role: session.role, userId: session.userId }));
});
