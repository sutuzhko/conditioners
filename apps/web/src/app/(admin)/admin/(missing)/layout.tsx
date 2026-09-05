import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/server/auth';

import { PanelFrame } from '../PanelFrame';

export const metadata: Metadata = {
  title: { default: 'Панель управления', template: '%s · Панель управления' },
  robots: { index: false, follow: false },
};

/* Каждый заход в панель читает сессию из базы — кешировать нечего. */
export const dynamic = 'force-dynamic';

/**
 * Оболочка для несуществующих адресов панели — issue #631.
 *
 * 🔴 Группа заведена ради **кода ответа**, а не ради вида. У группы `(panel)`
 * есть заготовка загрузки, и она открывает поток ответа раньше, чем страница
 * успевает сказать «не найдено»: статус к тому моменту отправлен, и `404`
 * подменяется на `200` — проверено на стенде. Здесь заготовки нет, поэтому
 * несовпавший адрес отвечает честным 404 и при этом остаётся в панели.
 *
 * Роль с разделом не сверяется: раздела нет. Отказ вместо «не найдено» ещё и
 * соврал бы — он значит «есть, но не для вас».
 */
export default async function AdminMissingLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return <PanelFrame session={session}>{children}</PanelFrame>;
}
