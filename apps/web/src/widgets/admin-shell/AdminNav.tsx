'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
  const list = useRef<HTMLUListElement>(null);
  const active = useRef<HTMLAnchorElement>(null);

  /**
   * На телефоне разделы лежат прокручиваемой лентой, и открытый раздел
   * оказывается за её правым краем — со стороны это выглядит так, будто
   * подсветки нет вовсе. Подводим его к середине.
   *
   * 🔴 Прокрутка задаётся ленте напрямую, а не через `scrollIntoView`: тот
   * ищет ближайшего прокручиваемого предка и на широком экране, где лента
   * не прокручивается вовсе, двигал вместо неё саму страницу — раздел
   * открывался прокрученным вниз.
   */
  useEffect(() => {
    const track = list.current;
    const link = active.current;
    if (track === null || link === null) return;
    if (track.scrollWidth <= track.clientWidth) return;

    track.scrollLeft = link.offsetLeft - (track.clientWidth - link.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav className={styles.nav} aria-label={texts.navLabel}>
      <ul className={styles.list} ref={list}>
        {ADMIN_SECTIONS.map((section) => {
          /* Раздел активен и на своих вложенных страницах: со страницы правки
             модели подсвеченным должен остаться «Каталог». */
          const current = pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <li key={section.href}>
              <Link
                className={[styles.link, current ? styles.active : null].filter(Boolean).join(' ')}
                href={{ pathname: section.href }}
                aria-current={current ? 'page' : undefined}
                ref={current ? active : undefined}
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
