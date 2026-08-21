import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/shared/ui';

import { AdminNav } from './AdminNav';
import { LogoutButton } from './LogoutButton';
import { adminShellContent as texts } from './content';
import styles from './AdminShell.module.css';

export interface AdminShellProps {
  children: ReactNode;
  /** Логин вошедшего. Из сессии, не из кода: администраторов может быть больше одного. */
  login: string;
}

/**
 * Оболочка панели: шапка, боковая навигация, область содержимого.
 *
 * Серверный компонент — клиентскими остаются только подсветка текущего
 * раздела и выход. Данных компании здесь нет намеренно: панель не должна
 * зависеть от того, заполнены они или ещё нет.
 */
export function AdminShell({ children, login }: AdminShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href={{ pathname: '/admin' }}>
          {texts.brand}
        </Link>

        <div className={styles.actions}>
          <span className={styles.login}>{login}</span>
          {/* Ссылка на сайт открывается в новой вкладке: правку хочется
              сверить, не теряя место в панели. */}
          <Link className={styles.site} href={{ pathname: '/' }} target="_blank" rel="noreferrer">
            {texts.site}
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.aside}>
          <AdminNav />
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
