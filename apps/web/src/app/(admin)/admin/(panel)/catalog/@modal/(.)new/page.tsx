import { ProductCreateModal } from '@/features/product-form';
import { requireOwnerPage } from '@/server/guards';

import { productFormData } from '../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новая модель» поверх списка каталога.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение.
 */
export default async function AdminProductNewModal() {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const { specDictionary } = await productFormData();

  return <ProductCreateModal specDictionary={specDictionary} />;
}
