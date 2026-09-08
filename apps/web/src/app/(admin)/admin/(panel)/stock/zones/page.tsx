import { redirect } from 'next/navigation';

import { requireOwnerPage } from '@/server/guards';

/**
 * Прежний адрес зон хранения: зоны стали вкладкой раздела (issue #352).
 * Адрес остаётся рабочим и разворачивает на свою вкладку — по той же причине,
 * что и журнал. Роль проверяется до разворота — по той же причине, что там
 * (issue #773).
 */
export default async function AdminStockZonesPage() {
  await requireOwnerPage();

  redirect('/admin/stock?tab=zones');
}
