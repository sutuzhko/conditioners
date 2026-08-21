import type { Metadata } from 'next';

import { LoginForm } from '@/features/admin-login';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Вход в панель управления',
  robots: { index: false, follow: false },
};

/* Страница не кешируется: за ней стоит проверка сессии в middleware. */
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

  /* 🔴 Адрес возврата приходит из запроса, то есть от кого угодно. Берём
     только внутренние пути: «//злодей.example» браузер считает абсолютным
     адресом, и открытый редирект уводил бы с сайта после успешного входа. */
  const redirectTo =
    next !== undefined && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  return (
    <div className={styles.page}>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
