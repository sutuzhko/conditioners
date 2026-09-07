import type { Metadata } from 'next';

import { JsonLd, buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/shared/seo';
import { Metrika } from '@/shared/analytics';
import { env } from '@/shared/config/env';
import { readiness } from '@/server/repo/settings';
import { legalTitle } from '@/entities/settings/lib/legal';
import { SkipLink } from '@/shared/ui';
import { Header } from '@/widgets/header';
import { Footer } from '@/widgets/footer';
import { ActionBar } from '@/widgets/action-bar';
import { SITE_NAV, LEAD_ANCHOR, POLICY_HREF, SKIP_LINK } from '@/shared/config/nav';

import { loadSettings } from './_lib/settings';

/**
 * Каркас публичной части. Данные компании читаются здесь один раз и раздаются
 * шапке и футеру: единственный источник гарантирует, что телефон в шапке и
 * телефон в футере не разойдутся (инвариант 8).
 *
 * Здесь же выводится разметка организации и сайта: она общая для всех страниц,
 * и на неё ссылаются по `@id` разметки страниц (docs/SEO.md §4). Нет названия
 * компании — нет и узла: выдумать его код не вправе.
 */
export const revalidate = 3600;

/**
 * 🔴 Индексируемость привязана к готовности настроек (ADR-090): пока владелец
 * не заполнил обязательные поля, публичная часть закрыта noindex — в выдачу
 * не должны попасть страницы с пустыми ценами и без данных компании. Заполнил —
 * ревалидация настроек пересобирает layout, и запрет снимается сам: ручного
 * шага, который можно забыть при запуске, здесь нет. Страница со своим
 * `robots` (404) этот выбор переопределяет.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [report, settings] = await Promise.all([readiness(), loadSettings()]);

  /* 🔴 Подтверждение прав не зависит от готовности настроек и стоит рядом с
     `robots` (issue #679). Владелец подтверждает права как раз тогда, когда
     сайт ещё закрыт от индексации: это первый шаг после выкладки, а не
     последний. Убрать тег на время noindex значит сделать шаг невозможным.

     Тег пишет Next по `verification`, а не разметка руками: пустое поле не
     даёт ни атрибута, ни пустого тега. */
  const verification = {
    ...(settings.seo.yandexVerification === '' ? {} : { yandex: settings.seo.yandexVerification }),
    ...(settings.seo.googleVerification === '' ? {} : { google: settings.seo.googleVerification }),
  };

  return {
    ...(Object.keys(verification).length === 0 ? {} : { verification }),
    ...(report.ready ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();
  const siteUrl = env.SITE_URL;

  const parts = {
    siteUrl,
    company: settings.company,
    // в разметку уезжает та же строка, что напечатана в реквизитах футера (ADR-106)
    legalName: legalTitle(settings.legal),
    contacts: settings.contacts,
    address: settings.address,
    social: settings.social,
    seo: settings.seo,
  };

  return (
    <>
      {/* первая ссылка в body: обход sticky-шапки с клавиатуры (WCAG 2.4.1) */}
      <SkipLink href={SKIP_LINK.href}>{SKIP_LINK.label}</SkipLink>
      {/* пустые узлы `JsonLd` отбрасывает сам — скрипта без содержимого не будет */}
      <JsonLd nodes={[buildOrganizationJsonLd(parts), buildWebSiteJsonLd(parts)]} />
      <Header
        company={settings.company}
        contacts={settings.contacts}
        nav={SITE_NAV}
        ctaHref={LEAD_ANCHOR}
      />
      <main id="top">{children}</main>
      <Footer
        company={settings.company}
        contacts={settings.contacts}
        address={settings.address}
        legal={settings.legal}
        nav={SITE_NAV}
        policyHref={POLICY_HREF}
      />
      {/* 🔴 Панель действий стоит в каркасе, а не на страницах: она нужна на
          каждой из них, и монтировать её семь раз значит однажды забыть.
          Телефон приходит из тех же настроек, что и телефон шапки, — второй
          источник разошёлся бы с первым (инвариант 8, ADR-009).

          Адрес заявки абсолютный: формы нет на каталоге, в статьях и в
          политике, и голый якорь вёл бы там в никуда. */}
      <ActionBar contacts={settings.contacts} leadHref={`/${LEAD_ANCHOR}`} />
      {/* 🔴 Счётчик последним и только в публичном кластере: в панели следить
          за собой смысла нет, она и так закрыта noindex. Номер не заполнен —
          в HTML не появляется ничего (ADR-024, issue #678). */}
      <Metrika counterId={settings.integrations.metrikaId} />
    </>
  );
}
