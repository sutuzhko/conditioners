import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/server/auth';

import { PANEL_NOT_FOUND_CONTENT as t } from '../not-found-content';
import { PanelNotFoundView } from '../PanelNotFoundView';

export const metadata: Metadata = { title: t.record.title };

/**
 * Запись раздела не найдена — issue #631.
 *
 * Ловит `notFound()` страниц панели: удалённый клиент, чужой наряд, статья,
 * которой больше нет. До этой границы такой адрес разбирался корневым
 * `not-found.tsx`, и владелец, открывший ссылку на удалённого клиента, видел
 * витрину сайта с кнопкой «Оставить заявку».
 *
 * 🔴 Код ответа здесь настоящий — 404 (issue #651). Раньше он был 200, и не
 * по решению, а по ограничению: у каждого раздела была своя заготовка
 * загрузки (`loading.tsx`), она открывала поток раньше, чем страница успевала
 * бросить `notFound()`, и статус к тому моменту был отправлен. Заготовки
 * уехали внутрь страниц — под `Suspense` каждого блока, — и до первого байта
 * ответа теперь доходит только чтение самой записи.
 *
 * 🔴 Отсюда правило для страниц панели: `notFound()` вызывается **снаружи**
 * любого `DataBlock`. Брошенный из блока, он застанет заготовку уже ушедшей в
 * ответ — и всё вернётся к 200.
 */
export default async function PanelRecordNotFound() {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return <PanelNotFoundView kind="record" role={session.role} />;
}
