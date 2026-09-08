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
import { activityFilterOf, activityParam } from '@/entities/activity/model';
import { json, withOwner } from '@/server/http';
import { list } from '@/server/repo/activity';
import { pageNumber } from '@/shared/lib/paging';

export const dynamic = 'force-dynamic';

/**
 * Значение условия из строки запроса — так же, как его видит страница.
 *
 * 🔴 `getAll`, а не `get`: повторённый параметр (`?actor=a&actor=b`) `get`
 * молча отдал бы первым значением, а страница на том же адресе условие
 * снимает. Дверей у журнала три, и отбирать они обязаны одинаково — иначе
 * ссылка, присланная из панели в запрос к API, отвечает не тем же списком.
 */
function condition(params: URLSearchParams, name: string): string | readonly string[] | undefined {
  const all = params.getAll(name);
  if (all.length === 0) return undefined;

  return all.length === 1 ? all[0] : all;
}

export const GET = withOwner(async (request) => {
  const params = request.nextUrl.searchParams;

  /* Мусор в условии снимает его, а не роняет запрос: разбирает всё
     `activityFilterOf`, тот же, которым читает адрес сама страница, — второй
     разбор здесь означал бы, что API и раздел отбирают по-разному. */
  const filter = activityFilterOf({
    actor: condition(params, 'actor'),
    role: condition(params, 'role'),
    section: condition(params, 'section'),
    entity: condition(params, 'entity'),
    from: condition(params, 'from'),
    to: condition(params, 'to'),
  });

  return json(await list({ page: pageNumber(activityParam(condition(params, 'page'))), filter }));
});
