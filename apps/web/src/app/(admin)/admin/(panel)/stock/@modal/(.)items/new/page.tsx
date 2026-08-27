import { StockCreateModal } from '@/features/stock-manager';

import { itemFormData } from '../../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новая позиция» поверх остатков.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение.
 */
export default async function StockItemNewModal() {
  const { products } = await itemFormData();

  return <StockCreateModal creation={{ kind: 'item', products }} />;
}
