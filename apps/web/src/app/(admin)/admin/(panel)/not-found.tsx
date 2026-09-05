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
 * 🔴 Код ответа здесь остаётся 200, и это не решение, а ограничение: у
 * каждого раздела своя заготовка загрузки, она открывает поток раньше, чем
 * страница бросает `notFound()`, и статус уже отправлен. То же и на `main` до
 * этой правки — там по такому адресу приезжала витрина, тоже с кодом 200.
 * Развести это может только пересмотр заготовок разделов, он идёт Фазой 3
 * эпика; отступление записано строкой в PIXEL_SPEC.
 */
export default async function PanelRecordNotFound() {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return <PanelNotFoundView kind="record" role={session.role} />;
}
