import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/server/auth';
import { AdminShell } from '@/widgets/admin-shell';

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

  return <AdminShell login={session.login}>{children}</AdminShell>;
}
