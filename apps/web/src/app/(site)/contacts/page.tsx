import type { Metadata } from 'next';

import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';
import { Contacts } from '@/widgets/contacts';
import { LeadSection } from '@/widgets/lead';

import { inCity } from '../_lib/city';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro } from '../_ui/PageIntro';
import { contactsContent as t } from './content';

/**
 * Контакты — посадочная под «кондиционеры Тула адрес/телефон» (docs/SEO.md §1).
 * Все NAP-данные приходят из настроек одним источником: расхождение телефона
 * на сайте и в Яндекс.Бизнесе бьёт по локальной выдаче (инвариант 8).
 */
export const revalidate = 3600;

const PATH = '/contacts';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(inCity(settings.address.city), settings.company.name.trim()),
    description: t.metaDescription(inCity(settings.address.city)),
  });
}

export default async function KontaktyPage() {
  const settings = await loadSettings();

  return (
    <>
      <PageIntro
        kicker={t.kicker}
        title={t.title}
        lead={t.lead}
        paragraphs={t.paragraphs}
        ctaHref={LEAD_ANCHOR}
        ctaLabel={t.cta}
      />
      <Contacts
        contacts={settings.contacts}
        address={settings.address}
        area={settings.area}
        geo={settings.geo}
        leadHref={LEAD_ANCHOR}
      />
      <LeadSection
        phone={primaryPhone(settings)}
        policyHref={POLICY_HREF}
        defaultTopic="Консультация"
        {...(settings.contacts.responseTime === ''
          ? {}
          : { responseTime: settings.contacts.responseTime })}
      />
    </>
  );
}
