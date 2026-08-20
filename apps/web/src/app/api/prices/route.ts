/**
 * Публичный прайс монтажа и ставки допуслуг — docs/API.md §4.
 */
import { json, withRoute } from '@/server/http';
import { getPrices } from '@/server/repo/prices';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async () => json(await getPrices()));
