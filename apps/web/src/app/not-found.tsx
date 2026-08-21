import type { Metadata } from 'next';
import Link from 'next/link';

import { NOT_FOUND_CONTENT as t, NOT_FOUND_ROUTES } from '@/shared/seo';

import styles from './not-found.module.css';

/**
 * Страница 404 (docs/SEO.md §5).
 *
 * Next отдаёт её с настоящим кодом 404 — редирект на главную вместо этого
 * прятал бы битые ссылки от Вебмастера. Ошибка объясняется словами и
 * заканчивается навигацией: человек, пришедший из выдачи по устаревшему
 * адресу, должен уйти в нужный раздел, а не закрыть вкладку.
 *
 * Фактов о компании здесь нет (инвариант 8): телефон и адрес живут в шапке и
 * футере, а страница ошибки ничего не обещает.
 */
export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.code}>{t.code}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>

        <nav className={styles.nav} aria-labelledby="not-found-nav">
          <h2 id="not-found-nav" className={styles.navTitle}>
            {t.navTitle}
          </h2>
          <ul className={styles.list}>
            {NOT_FOUND_ROUTES.map((route) => (
              <li key={route.path}>
                <Link className={styles.link} href={{ pathname: route.path }}>
                  {route.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
