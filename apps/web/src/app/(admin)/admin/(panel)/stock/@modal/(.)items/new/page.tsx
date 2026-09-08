import { StockCreateModal } from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';

import { itemFormData } from '../../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новая позиция» поверх остатков.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение.
 */
export default async function StockItemNewModal() {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const { products } = await itemFormData();

  return <StockCreateModal creation={{ kind: 'item', products }} />;
}
