'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_SECTIONS, adminShellContent as texts } from './content';
import styles from './AdminNav.module.css';

/**
 * Боковая навигация панели.
 *
 * Клиентский компонент ровно из-за одного: текущий раздел подсвечивается по
 * адресу. Всё остальное в оболочке остаётся серверным.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label={texts.navLabel}>
      <ul className={styles.list}>
        {ADMIN_SECTIONS.map((section) => {
          /* Раздел активен и на своих вложенных страницах: со страницы правки
             модели подсвеченным должен остаться «Каталог». */
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <li key={section.href}>
              <Link
                className={[styles.link, active ? styles.active : null].filter(Boolean).join(' ')}
                href={{ pathname: section.href }}
                aria-current={active ? 'page' : undefined}
              >
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
