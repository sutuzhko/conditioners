/**
 * Зоны хранения — docs/API.md §14.
 *
 * Список открыт обеим ролям, но монтажнику репозиторий отдаёт только его
 * машины: остаток гаража — это ещё и закупочные привычки владельца, и
 * открывать их всей команде он не обязан (ADR-134). Заводит зоны владелец.
 */
import { stockZoneCreateSchema } from '@/entities/stock/model';
import { json, readJson, validationError, withAdmin, withOwner } from '@/server/http';
import { createZone, zones } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_request, _context, session) => {
  return json({ zones: await zones({ role: session.role, userId: session.userId }) });
});

export const POST = withOwner(async (request) => {
  const parsed = stockZoneCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await createZone(parsed.data), 201);
});
