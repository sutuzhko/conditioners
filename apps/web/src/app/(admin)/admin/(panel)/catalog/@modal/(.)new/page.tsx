import { ProductCreateModal } from '@/features/product-form';

import { productFormData } from '../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новая модель» поверх списка каталога.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение.
 */
export default async function AdminProductNewModal() {
  const { specDictionary } = await productFormData();

  return <ProductCreateModal specDictionary={specDictionary} />;
}
