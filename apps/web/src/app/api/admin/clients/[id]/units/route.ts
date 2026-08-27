/**
 * Техника клиента — docs/API.md §12.
 *
 * Раздел владельца целиком, как и вся база клиентов: монтажник адрес получает
 * лишь со своим нарядом (ADR-105). Проверку делает `withOwner`, а не разметка.
 *
 * Записи заводятся сами из выполненного монтажа; этот маршрут — для того, что
 * поставили до этой системы или не мы.
 */
import { clientUnitCreateSchema } from '@/entities/client/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { create } from '@/server/repo/client-units';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = clientUnitCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await create(id, parsed.data), 201);
});
