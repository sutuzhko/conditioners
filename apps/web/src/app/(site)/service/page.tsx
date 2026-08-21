import type { Metadata } from 'next';

import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';
import { StepsTimeline } from '@/widgets/installation';
import { LeadSection } from '@/widgets/lead';
import { Diagnostics } from '@/widgets/service';

import { inCity } from '../_lib/city';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro, type PageIntroFact } from '../_ui/PageIntro';
import { serviceContent as t } from './content';

/**
 * Ремонт и обслуживание — посадочная под «ремонт / чистка / заправка
 * кондиционера Тула» (docs/SEO.md §1).
 *
 * 🔴 Прайса на сервисные работы в данных нет, поэтому разборы симптомов идут
 * без цен: блок сам говорит «рассчитаем после диагностики», а выдуманная сумма
 * противоречит и инварианту 8, и позиционированию сайта.
 */
export const revalidate = 3600;

const PATH = '/service';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  const place = inCity(settings.address.city);

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(place),
    description: t.metaDescription(place),
  });
}

export default async function RemontPage() {
  const settings = await loadSettings();

  const served = settings.area.served.trim();
  const warrantyEquipment = settings.warranty.equipment.trim();

  const maybeFacts: readonly (PageIntroFact | null)[] = [
    served === '' ? null : { label: t.areaFact, value: served },
    warrantyEquipment === '' ? null : { label: t.warrantyFact, value: warrantyEquipment },
  ];
  const facts = maybeFacts.filter((fact): fact is PageIntroFact => fact !== null);

  return (
    <>
      <PageIntro
        kicker={t.kicker}
        title={t.title(inCity(settings.address.city))}
        lead={t.lead}
        paragraphs={t.paragraphs}
        facts={facts}
        factsLabel={t.factsLabel}
        ctaHref={LEAD_ANCHOR}
        ctaLabel={t.cta}
      />
      <Diagnostics leadHref={LEAD_ANCHOR} />
      <StepsTimeline warranty={settings.warranty} />
      <LeadSection
        phone={primaryPhone(settings)}
        policyHref={POLICY_HREF}
        defaultTopic="Сервис и ремонт"
        {...(settings.contacts.responseTime === ''
          ? {}
          : { responseTime: settings.contacts.responseTime })}
      />
    </>
  );
}
