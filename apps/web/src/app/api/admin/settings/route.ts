/**
 * Все группы данных компании разом — docs/API.md §5.
 */
import { json, withAdmin } from '@/server/http';
import { getAll } from '@/server/repo/settings';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => json(await getAll()));
