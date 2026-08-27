/**
 * Карточка позиции склада — docs/API.md §14.
 *
 * Только владелец: в карточке порог заказа и весь журнал движений позиции, то
 * есть закупочные привычки компании целиком (ADR-134). Монтажнику остаток его
 * машины приходит таблицей остатков.
 */
import { stockItemUpdateSchema } from '@/entities/stock/model';
import { json, noContent, notFound, readJson, validationError, withOwner } from '@/server/http';
import { archiveItem, item, updateItem } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context, session) => {
  const { id } = await context.params;

  const found = await item(id, { role: session.role, userId: session.userId });
  if (found === null) return notFound('Позиция', 'f');

  return json(found);
});

export const PATCH = withOwner(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = stockItemUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await updateItem(id, parsed.data, { role: session.role, userId: session.userId }));
});

/** Архивирование, а не удаление: журнал движений позиции остаётся. */
export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  await archiveItem(id);

  return noContent();
});
