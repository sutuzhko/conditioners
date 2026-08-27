/**
 * Остатки по зонам — docs/API.md §14.
 *
 * Раздел открыт обеим ролям: монтажник закрывает наряд тем, что у него с
 * собой, и без остатка своей машины сделать этого не может. Что именно он
 * увидит, решает репозиторий — там же, где стоит отбор зон (ADR-134).
 *
 * Ревалидации здесь нет: склад на публичных страницах не показывается.
 */
import { json, withAdmin } from '@/server/http';
import { overview } from '@/server/repo/stock';
import { pageNumber } from '@/shared/lib/paging';

export const dynamic = 'force-dynamic';

/* Отметка «только ниже порога» приходит из адреса, а адрес правят руками и
   присылают друг другу: всё, кроме явного «да», — это «показывай всё». */
function isOn(value: string | null): boolean {
  return value === '1' || value === 'true';
}

export const GET = withAdmin(async (request, _context, session) => {
  const params = request.nextUrl.searchParams;

  return json(
    await overview(
      {
        query: params.get('q') ?? undefined,
        group: params.get('group') ?? undefined,
        low: isOn(params.get('low')),
        page: pageNumber(params.get('page') ?? undefined),
      },
      { role: session.role, userId: session.userId },
    ),
  );
});
