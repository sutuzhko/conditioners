'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { AdminRole } from '@/entities/staff/model';
import { Icon } from '@/shared/ui';

import { LogoutButton } from './LogoutButton';
import {
  ADMIN_GROUP_TITLES,
  ADMIN_ROLE_TITLES,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
} from './content';
import styles from './AdminNav.module.css';

export type AdminNavProps = {
  /** Монтажник видит три раздела из пятнадцати — список собирается по роли. */
  readonly role: AdminRole;
  /** Кто вошёл: имя из профиля, иначе логин. */
  readonly userName: string;
};

/** Инициалы для кружка: две первых буквы имени и фамилии, иначе одна. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part.slice(0, 1).toUpperCase()).join('');
}

/**
 * Боковая навигация панели.
 *
 * Колонка устроена в три яруса (ADR-188): сверху карточка «кто вошёл», в
 * середине прокручиваемый список разделов, внизу прибитое редкое — настройки,
 * профиль и выход. Прокручивается только середина: прибитый низ на то и
 * прибитый, чтобы за ним не нужно было листать.
 *
 * 🔴 На планшете колонка сворачивается в рельс, и подпись пункта уходит из
 * виду — но не из разметки: она остаётся для читалки, а не заменяется
 * `aria-label`. Имя, написанное дважды, расходится с видимым на первой же
 * правке, и читалка начинает называть пункт не так, как он подписан.
 *
 * Клиентский компонент ровно из-за одного: текущий раздел подсвечивается по
 * адресу. Всё остальное в оболочке остаётся серверным.
 */
export function AdminNav({ role, userName }: AdminNavProps) {
  const pathname = usePathname();

  const sections = columnSectionsFor(role);
  const bottom = bottomSectionsFor(role);

  /* Подсветку определяет пункт колонки, а не раздел: на `/admin/company`
     горят «Настройки», через которые в него и заходят. */
  const activeHref = navHrefOf(pathname);

  return (
    <div className={styles.column}>
      {/* Карточка «кто вошёл». Не ссылка и не меню: действия, которые открыл
          бы шеврон макета, стоят прибитыми в том же столбце ниже — дублировать
          их в выпадающем списке значит спрашивать «а эти два «Выйти» разные?». */}
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {initialsOf(userName)}
        </span>
        <span className={styles.whoText}>
          <span className={styles.whoName}>{userName}</span>
          <span className={styles.whoRole}>{ADMIN_ROLE_TITLES[role]}</span>
        </span>
      </div>

      <nav className={styles.nav} aria-label={texts.navLabel}>
        <ul className={styles.list}>
          {sections.map((section, index) => {
            const current = section.href === activeHref;

            /* Заголовок группы рисуется перед её первым разделом. Он
               декоративный: список ссылок и без него полный, поэтому от
               озвучки скрыт. */
            const group = section.group;
            const caption =
              group === undefined || sections[index - 1]?.group === group
                ? null
                : ADMIN_GROUP_TITLES[group];

            return (
              <li key={section.href}>
                {caption === null ? null : (
                  <span className={styles.caption} aria-hidden="true">
                    {caption}
                  </span>
                )}
                <Link
                  className={[styles.link, current ? styles.active : null]
                    .filter(Boolean)
                    .join(' ')}
                  href={{ pathname: section.href }}
                  aria-current={current ? 'page' : undefined}
                  title={section.title}
                >
                  <Icon className={styles.icon} name={section.icon} />
                  <span className={styles.label}>{section.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className={styles.foot} aria-label={texts.accountLabel}>
        <ul className={styles.list}>
          {bottom.map((section) => {
            const current = section.href === activeHref;

            return (
              <li key={section.href}>
                <Link
                  className={[styles.link, current ? styles.active : null]
                    .filter(Boolean)
                    .join(' ')}
                  href={{ pathname: section.href }}
                  aria-current={current ? 'page' : undefined}
                  title={section.title}
                >
                  <Icon className={styles.icon} name={section.icon} />
                  <span className={styles.label}>{section.title}</span>
                </Link>
              </li>
            );
          })}

          {/* Выход — кнопка, а не ссылка: он меняет состояние на сервере.
              Стоит последним по цене промаха: любой другой отменяется кнопкой
              «назад», этот стоит повторного входа. */}
          <li>
            <LogoutButton className={styles.logout} labelClassName={styles.label} />
          </li>
        </ul>
      </nav>
    </div>
  );
}
