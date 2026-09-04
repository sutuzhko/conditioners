import { redirect } from 'next/navigation';

/**
 * Прежний адрес зон хранения: зоны стали вкладкой раздела (issue #352).
 * Адрес остаётся рабочим и разворачивает на свою вкладку — по той же причине,
 * что и журнал.
 */
export default function AdminStockZonesPage() {
  redirect('/admin/stock?tab=zones');
}
