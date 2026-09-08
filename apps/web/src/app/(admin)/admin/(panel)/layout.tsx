import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/server/auth';
import { adminPageAllows, permissionsOf } from '@/server/permissions';
import { ADMIN_PATHNAME_HEADER } from '@/shared/config/admin-headers';
import { sectionAllows } from '@/widgets/admin-shell';

import { PanelFrame } from '../PanelFrame';

export const metadata: Metadata = {
  title: { default: 'Панель управления', template: '%s · Панель управления' },
  robots: { index: false, follow: false },
};

/* Каждый заход в панель читает сессию из базы — кешировать нечего. */
export const dynamic = 'force-dynamic';

/**
 * Оболочка панели управления.
 *
 * 🔴 Проверка сессии здесь настоящая, с обращением к базе. Middleware смотрит
 * только на наличие cookie: этого хватает, чтобы отсечь случайный заход, но
 * подделанное значение он не отличит.
 *
 * 🔴 Разграничение по ролям стоит здесь же, а не во вложенном layout раздела
 * (ADR-095): вложенный редирект срабатывает, когда страница уже отдана, и
 * монтажник успевал получить каталог с данными до того, как браузер уводил
 * его прочь. Внешний layout решает до первого байта.
 *
 * 🔴 Закрытый раздел отвечает отказом, а не разворотом (issue #353). Разворот
 * возвращал 307 — код «переехало» на запрос, который отклонён; отличить по
 * нему «нельзя» от «адрес сменился» нельзя ни человеку, ни программе.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  const jar = await headers();
  const pathname = jar.get(ADMIN_PATHNAME_HEADER) ?? '';

  /* 🔴 У администратора перечень ролей раздела не спрашивается: ему доступ
     раздаёт владелец переключателями, и отвечает за это центральная карта
     `server/permissions.ts` (ADR-344, issue #783). Остальным трём ролям
     отвечает колонка — их доступ задан ролью целиком. */
  const allowed =
    session.role === 'admin'
      ? adminPageAllows(pathname, permissionsOf(session))
      : sectionAllows(pathname, session.role);

  if (!allowed) {
    /* Куда идти дальше, говорит сама страница отказа: её единственная ссылка
       ведёт на календарь своих выездов — рабочий экран монтажника. */
    forbidden();
  }

  return <PanelFrame session={session}>{children}</PanelFrame>;
}
