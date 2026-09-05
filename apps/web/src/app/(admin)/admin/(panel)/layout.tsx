import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/server/auth';
import { navCounts } from '@/server/services/nav-counts';
import { ADMIN_PATHNAME_HEADER } from '@/shared/config/admin-headers';
import { AdminShell, NAV_COOKIE, sectionAllows } from '@/widgets/admin-shell';

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

  if (!sectionAllows(pathname, session.role)) {
    /* Куда идти дальше, говорит сама страница отказа: её единственная ссылка
       ведёт на календарь своих выездов — рабочий экран монтажника. */
    forbidden();
  }

  /* Состояние колонки разделов читается на сервере: развёрнутая по умолчанию
     панель, схлопывающаяся после гидратации, мигала бы на каждом заходе. */
  const cookieJar = await cookies();
  const navOpen = cookieJar.get(NAV_COOKIE)?.value !== 'off';

  /* 🔴 Счётчики очередей считаются здесь, один раз на заход, и приходят в
     оболочку пропсами (ADR-309). Раздел, заводящий свой счётчик, видит только
     себя: цифра у «Заявок» появлялась бы, лишь пока открыты сами заявки. */
  const counts = await navCounts(session.role);

  return (
    <AdminShell
      login={session.login}
      name={session.name}
      role={session.role}
      navOpen={navOpen}
      counts={counts}
    >
      {children}
    </AdminShell>
  );
}
