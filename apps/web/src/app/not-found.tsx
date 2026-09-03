import type { Metadata } from 'next';
import Link from 'next/link';

import { productSchema } from '@/entities/product/model';
import { listFeatured } from '@/server/repo/products';
import { CATALOG_PATH, NOT_FOUND_CONTENT as t, NOT_FOUND_ROUTES, productPath } from '@/shared/seo';
import { LEAD_ANCHOR, POLICY_HREF, SITE_NAV, SKIP_LINK } from '@/shared/config/nav';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { ButtonLink, SkipLink } from '@/shared/ui';
import { ActionBar } from '@/widgets/action-bar';
import { Catalog } from '@/widgets/catalog';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';

import { loadSettings } from './(site)/_lib/settings';
import styles from './not-found.module.css';

/**
 * Страница 404 (docs/SEO.md §5, issue #291, issue #19).
 *
 * Next отдаёт её с настоящим кодом 404 — редирект на главную вместо этого
 * прятал бы битые ссылки от Вебмастера.
 *
 * 🔴 Шапка и подвал те же, что на остальных публичных страницах. Раньше
 * страница рендерилась в корневом каркасе — без шапки, подвала и логотипа, —
 * и человек, пришедший из выдачи по устаревшему адресу, оказывался в тупике с
 * единственным выходом «назад». Для сайта, который живёт поисковым трафиком,
 * это потерянный посетитель на каждой устаревшей ссылке.
 *
 * 🔴 Каркас собирается здесь, а не наследуется: `app/not-found.tsx` живёт в
 * корневом сегменте и рендерится в `app/layout.tsx`, а layout группы `(site)`
 * до неё не доходит. Данные читаются те же и одним вызовом — телефон в шапке
 * и телефон в подвале не имеют права разойтись (инвариант 8, ADR-009).
 *
 * 🔴 `noindex` сохраняется: страница вернулась в общий каркас, но в индекс не
 * идёт. `follow` оставлен — по ссылкам с неё робот ходить должен.
 */
export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: true },
};

/** Ревалидация та же, что у публичных страниц: данные компании те же самые. */
export const revalidate = 3600;

/**
 * Сколько моделей показать. Три — ряд каталога на десктопе и три экрана на
 * телефоне: человек искал кондиционер, раз пришёл сюда по ссылке из выдачи,
 * но 404 — это не витрина, и разворачивать здесь весь ассортимент незачем.
 */
const MODELS_LIMIT = 3;

export default async function NotFound() {
  const [settings, rawFeatured] = await Promise.all([loadSettings(), listFeatured()]);

  const featured = rawFeatured.map((dto) => productSchema.parse(dto)).slice(0, MODELS_LIMIT);
  const phone = settings.contacts.phones[0]?.trim() ?? '';

  return (
    <>
      <SkipLink href={SKIP_LINK.href}>{SKIP_LINK.label}</SkipLink>
      <Header
        company={settings.company}
        contacts={settings.contacts}
        nav={SITE_NAV}
        ctaHref={`/${LEAD_ANCHOR}`}
      />

      <main id="top">
        <section className={styles.section}>
          <div className={styles.container}>
            <p className={styles.code}>{t.code}</p>
            <h1 className={styles.title}>{t.title}</h1>
            <p className={styles.lead}>{t.lead}</p>

            <div className={styles.actions}>
              <ButtonLink href="/" size="lg">
                {t.homeLink}
              </ButtonLink>
              {/* 🔴 Самый короткий выход из тупика — позвонить. Номер из
                  настроек: выдумать его код не вправе (инвариант 8). */}
              {phone === '' ? null : (
                <a
                  className={styles.phone}
                  href={phoneHref(phone)}
                  aria-label={`${t.callLabel} ${formatPhone(phone)}`}
                >
                  {formatPhone(phone)}
                </a>
              )}
            </div>

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
        </section>

        {/* Модели приходят из базы, а не из вёрстки: тот же список
            `featured`, что на главной, и та же витрина, что её рисует. */}
        {featured.length === 0 ? null : (
          <Catalog
            id="models"
            products={featured}
            orderHref={`/${LEAD_ANCHOR}`}
            productHref={(slug) => ({ pathname: productPath(slug) })}
            catalogHref={CATALOG_PATH}
          />
        )}
      </main>

      <Footer
        company={settings.company}
        contacts={settings.contacts}
        address={settings.address}
        legal={settings.legal}
        nav={SITE_NAV}
        policyHref={POLICY_HREF}
      />
      <ActionBar contacts={settings.contacts} leadHref={`/${LEAD_ANCHOR}`} />
    </>
  );
}
