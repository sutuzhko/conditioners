import type { ReactNode } from 'react';

import type { AdminRole } from '@/entities/staff/model';
import type { AdminCounts } from '@/shared/config/admin-counters';
import { ThemeToggle } from '@/shared/ui';

import { AdminNav } from './AdminNav';
import { AdminTabs } from './AdminTabs';
import { NavState } from './NavState';
import { NavToggle } from './NavToggle';
import styles from './AdminShell.module.css';

export interface AdminShellProps {
  children: ReactNode;
  /** Логин вошедшего. Из сессии, не из кода: администраторов может быть больше одного. */
  login: string;
  /** Имя вошедшего, если заполнено: в колонке оно понятнее логина. */
  name?: string | null | undefined;
  /** Роль решает, какие разделы показывать (ADR-092). */
  role: AdminRole;
  /**
   * Была ли колонка разделов развёрнута в прошлый раз. Приходит из cookie,
   * прочитанной на сервере, — панель не мигает при каждом заходе.
   */
  navOpen?: boolean | undefined;
  /**
   * Сколько ждёт в очередях: наряды в работе, новые обращения, отзывы на
   * модерации (ADR-309).
   *
   * 🔴 Приходит пропсом и считается в одном месте — `server/services/nav-counts`.
   * Оболочка к базе не ходит и о том, как эти числа получены, не знает.
   */
  counts?: AdminCounts | undefined;
}

/**
 * Оболочка панели: боковая навигация и область содержимого.
 *
 * 🔴 Верхней полосы у панели нет (ADR-309): в макете колонка разделов
 * начинается от верха окна, а её содержимое разошлось по местам —
 * переключатель колонки встал влево от заголовка раздела, переключатель темы
 * ушёл в строку значков справа, «Открыть сайт» — вниз колонки. Полоса стоила
 * 66px вертикали на каждом экране панели и повторяла название вкладки
 * браузера.
 *
 * Серверный компонент — клиентскими остаются подсветка текущего раздела,
 * выход, меню профиля и переключатель колонки. Данных компании здесь нет
 * намеренно: панель не должна зависеть от того, заполнены они или ещё нет.
 *
 * Колонка разделов прижата к краю окна, а не вписана в общий контейнер: она
 * граница рабочей области, и отступ слева читался как «панель не дотянулась».
 */
export function AdminShell({
  children,
  login,
  name,
  role,
  navOpen = true,
  counts,
}: AdminShellProps) {
  return (
    <NavState initialOpen={navOpen}>
      <div className={styles.app}>
        <div className={styles.body}>
          <aside className={styles.aside}>
            <AdminNav role={role} userName={name ?? login} counts={counts} />
          </aside>

          <main className={styles.content}>
            {/* Строка раздела: слева переключатель колонки, справа значки.
                Заголовок раздела встанет между ними, когда сами разделы
                придут к макету, — пока он остаётся своим у каждой страницы.
                Признак `data-shell` нужен сценарию: он отличает строку
                оболочки от шапки раздела, у которой свои кнопки. */}
            <div className={styles.tools} data-shell="tools">
              <NavToggle />

              <div className={styles.actions}>
                <ThemeToggle />
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>

      {/* До 600px навигация уходит вниз экрана: колонка там не показывается
          вовсе, а лента из тринадцати пунктов листалась вслепую. */}
      <AdminTabs role={role} />
    </NavState>
  );
}
