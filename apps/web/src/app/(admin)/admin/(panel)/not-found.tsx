import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/server/auth';

import { PANEL_NOT_FOUND_CONTENT as t } from './not-found-content';
import { PanelNotFoundView } from './PanelNotFoundView';

export const metadata: Metadata = { title: t.title };

/**
 * Граница «не найдено» внутри панели — issue #631.
 *
 * Рисуется в оболочке своей группы, поэтому у человека остаются колонка
 * разделов и карточка вошедшего: он не выпадает из панели, а видит пустой
 * раздел с выходом.
 *
 * 🔴 Сессия читается второй раз за заход, и это осознанно. Роль в границу не
 * приходит — Next не передаёт `not-found.tsx` ничего от layout, — а выход без
 * роли выбрать нельзя: монтажник, отправленный на сводку, получил бы 403
 * вместо выхода. Лишний запрос стоит одной страницы ошибки.
 */
export default async function PanelNotFound() {
  const session = await getAdminSession();

  /* До границы доходит только вошедший — layout разворачивает остальных. Но
     сессия могла истечь между проверкой и отрисовкой: тогда честнее увести на
     вход, чем гадать роль. */
  if (session === null) redirect('/admin/login');

  return <PanelNotFoundView role={session.role} />;
}
