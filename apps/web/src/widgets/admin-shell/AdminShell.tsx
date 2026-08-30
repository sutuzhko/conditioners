import Link from 'next/link';
import type { ReactNode } from 'react';

import type { AdminRole } from '@/entities/staff/model';
import { ThemeToggle } from '@/shared/ui';

import { AdminNav } from './AdminNav';
import { LogoutButton } from './LogoutButton';
import { NavState } from './NavState';
import { NavToggle } from './NavToggle';
import { adminShellContent as texts } from './content';
import styles from './AdminShell.module.css';

export interface AdminShellProps {
  children: ReactNode;
  /** Логин вошедшего. Из сессии, не из кода: администраторов может быть больше одного. */
  login: string;
  /** Имя вошедшего, если заполнено: в шапке оно понятнее логина. */
  name?: string | null | undefined;
  /** Роль решает, какие разделы показывать (ADR-092). */
  role: AdminRole;
  /**
   * Была ли колонка разделов развёрнута в прошлый раз. Приходит из cookie,
   * прочитанной на сервере, — панель не мигает при каждом заходе.
   */
  navOpen?: boolean | undefined;
}

/**
 * Оболочка панели: шапка, боковая навигация, область содержимого.
 *
 * Серверный компонент — клиентскими остаются подсветка текущего раздела,
 * выход и переключатель колонки. Данных компании здесь нет намеренно: панель
 * не должна зависеть от того, заполнены они или ещё нет.
 *
 * Колонка разделов прижата к краю окна, а не вписана в общий контейнер: она
 * граница рабочей области, и отступ слева читался как «панель не дотянулась».
 */
export function AdminShell({ children, login, name, role, navOpen = true }: AdminShellProps) {
  return (
    <NavState initialOpen={navOpen}>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <NavToggle />

            {/* 🔴 Две подписи вместо одной: на телефоне полные названия уводили
              шапку на вторую строку — сотня пикселей из восьмисот уходила на
              то, что и так понятно. Переключает их CSS, а не JS: выбор в JS
              дал бы либо расхождение гидратации, либо мигание после загрузки. */}
            <Link className={styles.brand} href={{ pathname: '/admin' }}>
              <span className={styles.wide}>{texts.brand}</span>
              <span className={styles.narrow}>{texts.brandShort}</span>
            </Link>
          </div>

          <div className={styles.actions}>
            <span className={styles.login}>{name ?? login}</span>
            {/* Ссылка на сайт открывается в новой вкладке: правку хочется
              сверить, не теряя место в панели. */}
            <Link className={styles.site} href={{ pathname: '/' }} target="_blank" rel="noreferrer">
              <span className={styles.wide}>{texts.site}</span>
              <span className={styles.narrow}>{texts.siteShort}</span>
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <div className={styles.body}>
          <aside className={styles.aside}>
            <AdminNav role={role} />
          </aside>

          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </NavState>
  );
}
