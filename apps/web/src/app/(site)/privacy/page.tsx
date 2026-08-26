import type { Metadata } from 'next';

import { Card } from '@/shared/ui';

import { buildPageMetadata } from '@/shared/seo';
import { env } from '@/shared/config/env';
import { legalTitle } from '@/entities/settings/lib/legal';
import { loadSettings, type SiteSettings } from '../_lib/settings';
import { PageIntro } from '../_ui/PageIntro';
import { policyContent as t, policySections } from './content';
import styles from './Policy.module.css';

/**
 * Политика обработки персональных данных — обязательная страница по 152-ФЗ
 * (docs/PROJECT.md, часть 5). На неё ведут футер и обе формы сайта.
 *
 * 🔴 Реквизиты оператора приходят из настроек и не имеют значений по умолчанию
 * (инвариант 8): незаполненное поле не рисуется вовсе, а весь блок реквизитов
 * заменяется объяснением. Выдуманный ИНН в юридическом документе — это
 * недостоверные сведения, а не заглушка.
 */
export const revalidate = 3600;

const PATH = '/privacy';

type Requisite = { readonly label: string; readonly value: string };

/**
 * Наименование оператора для текста: реквизиты, затем название компании.
 *
 * Реквизиты берутся тем же `legalTitle`, которым они напечатаны в футере и
 * отданы в разметку (ADR-106): оператор персональных данных в политике и
 * организация в разметке — одно лицо, и называться они обязаны одинаково.
 */
function operatorName(settings: SiteSettings): string {
  const legal = settings.legal.name.trim() === '' ? '' : legalTitle(settings.legal);
  const candidates = [legal, settings.company.name.trim()];

  return candidates.find((value) => value !== '') ?? t.operatorFallback;
}

function requisites(settings: SiteSettings): readonly Requisite[] {
  const { legal, contacts } = settings;
  // подпись зависит от формы: у предпринимателя номер называется ОГРНИП
  const ogrnLabel = legal.form === 'ИП' ? t.labelOgrnIp : t.labelOgrn;

  return [
    { label: t.labelInn, value: legal.inn.trim() },
    { label: ogrnLabel, value: legal.ogrn.trim() },
    { label: t.labelAddress, value: legal.address.trim() },
    { label: t.labelEmail, value: contacts.email.trim() },
  ].filter((item) => item.value !== '');
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: PATH,
    title: t.metaTitle(settings.company.name.trim()),
    description: t.metaDescription,
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
  });
}

export default async function PolicyPage() {
  const settings = await loadSettings();
  const operator = operatorName(settings);
  const sections = policySections(operator);
  const rows = requisites(settings);

  return (
    <>
      <PageIntro title={t.title} lead={t.lead} />

      <section className={styles.section} aria-label={t.title}>
        <div className={styles.container}>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className={styles.block}>
              <h2 className={styles.title}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.items === undefined ? null : (
                <ul className={styles.list}>
                  {section.items.map((item) => (
                    <li key={item} className={styles.item}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className={styles.block}>
            <h2 className={styles.title}>{t.requisitesTitle}</h2>
            <p className={styles.paragraph}>{operator}</p>
            {rows.length === 0 ? (
              <p className={styles.note}>{t.requisitesEmpty}</p>
            ) : (
              <Card padding="lg" variant="soft">
                <dl className={styles.requisites}>
                  {rows.map((row) => (
                    <div key={row.label} className={styles.requisite}>
                      <dt className={styles.requisiteLabel}>{row.label}</dt>
                      <dd className={styles.requisiteValue}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
