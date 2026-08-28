/**
 * Что осталось незаполненным перед запуском — docs/API.md §5, TECH_DECISIONS §15.
 *
 * Сохранять неполные данные владелец может: он заполняет их постепенно.
 * А вот уехать в прод с заглушкой «ЗАПОЛНИТЕ В АДМИНКЕ» — нет.
 */
import { json, withOwner } from '@/server/http';
import { readiness } from '@/server/repo/settings';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async () => json(await readiness()));
