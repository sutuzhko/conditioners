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

/* Архив показывается только по прямой просьбе и только владельцу: без этого
   сданная в архив зона становится недостижимой, а вместе с ней и кнопка
   вернуть её обратно. Отбор по роли остаётся в репозитории. */
export const GET = withAdmin(async (request, _context, session) => {
  const archived = request.nextUrl.searchParams.get('archived');

  return json({
    zones: await zones(
      { role: session.role, userId: session.userId },
      { archived: archived === '1' || archived === 'true' },
    ),
  });
});

export const POST = withOwner(async (request) => {
  const parsed = stockZoneCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await createZone(parsed.data), 201);
});
