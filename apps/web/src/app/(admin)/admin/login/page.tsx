import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm, safeRedirectTo } from '@/features/admin-login';
import { getAdminSession } from '@/server/auth';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Вход в панель управления',
  robots: { index: false, follow: false },
};

/* Страница не кешируется: за ней стоит проверка сессии. */
export const dynamic = 'force-dynamic';

/**
 * Вход в панель управления.
 *
 * Лежит вне группы `(panel)`, поэтому оболочки с навигацией здесь нет: пока
 * человек не вошёл, показывать ему разделы незачем.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  /* 🔴 Проверка настоящая, а не по наличию cookie. Разворот «уже вошёл — иди в
     панель» стоял в middleware, а тот видит только присутствие cookie: человек
     с истёкшей или подписанной другим секретом сессией не мог дойти до формы
     вовсе и ходил по кругу между `/admin` и `/admin/login`. */
  const session = await getAdminSession();
  if (session !== null) redirect('/admin');

  /* 🔴 Адрес возврата приходит из запроса, то есть от кого угодно. Разбор —
     чистой функцией рядом с формой: она проверяет значение тем же парсером
     URL, который его потом исполнит, и отдаёт нормализованный путь. Перечислять
     запрещённые написания строкой бесполезно — парсер чистит адрес до разбора,
     и проверка строки всегда отстаёт на одно написание. */
  const redirectTo = safeRedirectTo(next);

  return (
    <div className={styles.page}>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
