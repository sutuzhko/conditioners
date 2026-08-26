/**
 * Наряды — docs/API.md §13.
 *
 * Список открыт обеим ролям: монтажник работает в той же панели и видит в ней
 * свои выезды. Что именно он увидит, решает репозиторий — там же, где стоит
 * фильтр по исполнителю (CRM.md §6). Заводит наряды только владелец.
 *
 * Ревалидации здесь нет: наряды на публичных страницах не показываются.
 */
import { isOrderPeriod, isOrderTab, orderCreateSchema } from '@/entities/order/model';
import { json, readJson, validationError, withAdmin, withOwner } from '@/server/http';
import { create, list } from '@/server/repo/orders';
import { pageNumber } from '@/shared/lib/paging';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (request, _context, session) => {
  const params = request.nextUrl.searchParams;

  const tab = params.get('tab');
  const period = params.get('period');

  return json(
    await list(
      {
        query: params.get('q') ?? undefined,
        /* Незнакомое значение — это умолчание вкладки и периода, а не 400:
           адрес списка правят руками и присылают друг другу, и отказ вместо
           списка там ничего не объясняет. */
        tab: tab !== null && isOrderTab(tab) ? tab : undefined,
        period: period !== null && isOrderPeriod(period) ? period : undefined,
        page: pageNumber(params.get('page') ?? undefined),
      },
      { role: session.role, userId: session.userId },
    ),
  );
});

export const POST = withOwner(async (request) => {
  const parsed = orderCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await create(parsed.data), 201);
});
