/**
 * Точечная ревалидация маршрутов — docs/API.md §13.
 *
 * Наружу закрыт: маршрут лежит под `/api/admin`, то есть требует сессии
 * админки на уровне middleware и обработчика.
 */
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { revalidateRoutes, revalidateSchema } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request) => {
  const parsed = revalidateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  revalidateRoutes(parsed.data.paths, parsed.data.scope ?? 'page');

  return json({ revalidated: parsed.data.paths });
});
