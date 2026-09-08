import { StockCreateModal } from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';

import { zoneFormData } from '../../../data';

export const dynamic = 'force-dynamic';

/** Окно «Новая зона» поверх списка зон. */
export default async function StockZoneNewModal() {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const { people } = await zoneFormData();

  return <StockCreateModal creation={{ kind: 'zone', people }} />;
}
