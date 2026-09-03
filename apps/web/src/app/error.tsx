'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { ERROR_PAGE_CONTENT as t } from '@/shared/config/error-page';
import { POLICY_HREF, SITE_NAV } from '@/shared/config/nav';
import { BrandMark, Button, ButtonLink } from '@/shared/ui';

import styles from './error.module.css';

/**
 * Запасной экран падения рендера: недоступная база, необработанное исключение
 * в серверном компоненте. До него страницы отдавали голый экран Next — без
 * объяснения и выхода (аудит 23 августа, BUGS).
 *
 * 🔴 Каркас здесь свой и сознательно урезанный (issue #291). Границы ошибок в
 * Next — клиентские компоненты, а настоящие шапка и подвал читают из базы
 * название, телефон и реквизиты; экран же появляется ровно тогда, когда база
 * не отвечает. Поэтому от каркаса остаётся то, что не зависит от данных: знак
 * бренда со ссылкой на главную, карта разделов и ссылка на политику. Ни
 * названия компании, ни телефона здесь нет и быть не может (инвариант 8).
 */
export default function RenderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // след в консоли браузера — единственное место, где ошибку видно с клиента
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label={t.brandLabel}>
          <BrandMark size={34} />
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.code}>{t.code}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.lead}>{t.lead}</p>

          <div className={styles.actions}>
            <Button size="lg" onClick={reset}>
              {t.retry}
            </Button>
            <ButtonLink href="/" size="lg" variant="bordered">
              {t.homeLink}
            </ButtonLink>
          </div>
        </div>
      </main>

      <footer className={styles.foot}>
        <div className={styles.container}>
          <h2 className={styles.footTitle}>{t.navTitle}</h2>
          <ul className={styles.list}>
            {SITE_NAV.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={POLICY_HREF} className={styles.policy}>
            {t.policyLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
