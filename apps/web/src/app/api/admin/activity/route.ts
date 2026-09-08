/**
 * Журнал событий — docs/API.md §18.
 *
 * 🔴 Список отдаётся только страницами (issue #816). Параметра «сколько» нет
 * ни в адресе, ни в репозитории: журнал растёт тысячами строк в месяц, и
 * ответ «отдай всё» однажды кладёт панель вместе с базой. Номер страницы за
 * пределами списка прижимается к последней существующей, а не отвечает
 * ошибкой: адрес правят руками и присылают друг другу.
 *
 * 🔴 Метода записи здесь нет и не будет: событие пишет сервис в одной
 * транзакции с самим изменением (ADR-345). Ручка «создать событие» означала бы
 * журнал, в который можно дописать строку задним числом.
 */
import { activityFilterOf } from '@/entities/activity/model';
import { json, withOwner } from '@/server/http';
import { list } from '@/server/repo/activity';
import { pageNumber } from '@/shared/lib/paging';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async (request) => {
  const params = request.nextUrl.searchParams;

  /* Мусор в условии снимает его, а не роняет запрос: разбирает всё
     `activityFilterOf`, тот же, которым читает адрес сама страница, — второй
     разбор здесь означал бы, что API и раздел отбирают по-разному. */
  const filter = activityFilterOf({
    actor: params.get('actor') ?? undefined,
    role: params.get('role') ?? undefined,
    section: params.get('section') ?? undefined,
    entity: params.get('entity') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  });

  return json(await list({ page: pageNumber(params.get('page') ?? undefined), filter }));
});
