import { StockCreateModal } from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';

import { moveFormData } from '../../data';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ item?: string; from?: string; to?: string; kind?: string }>;
};

/**
 * Окно перемещения поверх остатков.
 *
 * 🔴 Сюда приводит отпущенная над зоной ячейка и кнопка «Переместить» в строке
 * (ADR-137): позиция и зоны уже подставлены адресом, вводят одно количество.
 * Молча перекладывать остаток по отпусканию мыши нельзя — промах пальцем стал
 * бы записью в журнале.
 */
export default async function StockMoveModal({ searchParams }: PageProps) {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const params = await searchParams;
  const { items, zones, initial } = await moveFormData(params);

  return <StockCreateModal creation={{ kind: 'move', items, zones, initial }} />;
}
