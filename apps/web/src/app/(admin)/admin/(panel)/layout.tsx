import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/server/auth';
import { AdminShell, NAV_COOKIE } from '@/widgets/admin-shell';

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
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  /* Состояние колонки разделов читается на сервере: развёрнутая по умолчанию
     панель, схлопывающаяся после гидратации, мигала бы на каждом заходе. */
  const jar = await cookies();
  const navOpen = jar.get(NAV_COOKIE)?.value !== 'off';

  return (
    <AdminShell login={session.login} navOpen={navOpen}>
      {children}
    </AdminShell>
  );
}
