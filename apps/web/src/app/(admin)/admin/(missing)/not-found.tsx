import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/server/auth';

import { ErrorDocumentAttrs } from '../../../ErrorDocumentAttrs';

import { PANEL_NOT_FOUND_CONTENT as t } from '../not-found-content';
import { PanelNotFoundView } from '../PanelNotFoundView';

export const metadata: Metadata = { title: t.address.title };

/**
 * Несуществующий адрес панели — issue #631.
 *
 * 🔴 Документ здесь служебный (`html#__next_error__`), а не корневой каркас:
 * настоящий 404 Next отдаёт своим документом, и в нём нет ни `lang`, ни темы.
 * Ставит их `ErrorDocumentAttrs` — та же починка, что у страницы отказа. Без
 * неё тёмная панель показывала белую страницу, а читалка озвучивала русский
 * текст по-английски.
 *
 * 🔴 Сессия читается второй раз за заход, но в базу уходит один запрос:
 * `getAdminSession` обёрнут `cache()`. Роль сюда не приходит — Next не
 * передаёт границе ничего от layout'а, — а без роли не выбрать выход:
 * монтажник, отправленный на сводку, получил бы 403 вместо выхода.
 */
export default async function AdminMissingNotFound() {
  const session = await getAdminSession();

  /* Сюда доходит только вошедший — layout разворачивает остальных. Но сессия
     могла истечь между проверкой и отрисовкой: тогда честнее увести на вход,
     чем гадать роль. */
  if (session === null) redirect('/admin/login');

  return (
    <>
      <ErrorDocumentAttrs />
      <PanelNotFoundView kind="address" role={session.role} />
    </>
  );
}
