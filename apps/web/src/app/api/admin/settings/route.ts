/**
 * Все группы данных компании разом — docs/API.md §5.
 *
 * 🔴 Раздел владельца, а не любой сессии панели (ADR-092). Маршруты стояли под
 * `withAdmin`, то есть монтажник читал данные компании и мог переписать
 * реквизиты продавца на всём сайте: страница `/admin/company` закрыта
 * `requireOwnerPage`, но защита в разметке — это подсказка интерфейса, а не
 * защита. В группе лежат персональные данные и адреса доставки уведомлений.
 */
import { json, withOwner } from '@/server/http';
import { getAll } from '@/server/repo/settings';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async () => json(await getAll()));
