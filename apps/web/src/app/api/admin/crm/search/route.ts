import { json, withAdmin } from '@/server/http';
import { search } from '@/server/repo/crm';

export const dynamic = 'force-dynamic';

/**
 * Поиск по календарю — docs/API.md §10.
 *
 * 🔴 `withAdmin`, а не `withOwner`: искать может и монтажник, но найдёт он
 * только свои наряды. Разграничение живёт в запросе к базе (`repo/crm`), а не
 * здесь: маршрут — контроллер и решает, что вернуть, а не кому что положено
 * (ADR-142).
 *
 * Пустой запрос — законный случай, а не ошибка: так выглядит очищенное поле
 * поиска, и отвечать на него `400` значило бы мигать ошибкой при каждом
 * стирании строки.
 */
export const GET = withAdmin(async (request, _context, session) => {
  const query = new URL(request.url).searchParams.get('q') ?? '';

  return json({ items: await search(session, query) });
});
