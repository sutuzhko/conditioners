/**
 * Клиенты — docs/API.md §12.
 *
 * Раздел владельца целиком: в базе адреса и телефоны людей, и монтажник видит
 * адрес только своего наряда. Проверка роли — в `withOwner`, а не в разметке
 * (ADR-092, ADR-105).
 */
import { clientCreateSchema } from '@/entities/client/model';
import { pageNumber } from '@/shared/lib/paging';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { create, list } from '@/server/repo/clients';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async (request) => {
  const params = request.nextUrl.searchParams;

  return json(
    await list({
      query: params.get('q') ?? undefined,
      page: pageNumber(params.get('page') ?? undefined),
    }),
  );
});

export const POST = withOwner(async (request) => {
  const parsed = clientCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await create(parsed.data), 201);
});
