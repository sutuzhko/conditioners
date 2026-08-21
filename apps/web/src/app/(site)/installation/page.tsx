import type { Metadata } from 'next';

import { priceRowSchema } from '@/entities/price/model';
import { getPrices } from '@/server/repo/prices';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';
import { formatMoney } from '@/shared/lib/format';
import { HonestPricing, ScamAccordion } from '@/widgets/honesty';
import { StepsTimeline } from '@/widgets/installation';
import { LeadSection } from '@/widgets/lead';
import { Pricing } from '@/widgets/pricing';

import { inCity } from '../_lib/city';
import { cheapestPriceRow, installPriceFrom } from '../_lib/prices';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro, type PageIntroFact } from '../_ui/PageIntro';
import { installationContent as t } from './content';

/**
 * Установка кондиционеров — посадочная под «установка / монтаж кондиционера
 * Тула» (docs/SEO.md §1). Собирается из блоков монтажа и честности о цене;
 * данные читает страница (docs/ORCHESTRATION.md).
 */
export const revalidate = 3600;

const PATH = '/installation';

export async function generateMetadata(): Promise<Metadata> {
  const [settings, { prices }] = await Promise.all([loadSettings(), getPrices()]);
  const from = installPriceFrom(prices.map((row) => priceRowSchema.parse(row)));
  const place = inCity(settings.address.city);

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(place, from === null ? null : formatMoney(from)),
    description: t.metaDescription(place),
  });
}

export default async function UstanovkaPage() {
  const [{ prices, extras }, settings] = await Promise.all([getPrices(), loadSettings()]);

  const priceRows = prices.map((row) => priceRowSchema.parse(row));
  const cheapest = cheapestPriceRow(priceRows);
  const warrantyInstallation = settings.warranty.installation.trim();

  const maybeFacts: readonly (PageIntroFact | null)[] = [
    cheapest === null ? null : { label: t.installFact, value: t.from(formatMoney(cheapest.price)) },
    cheapest === null ? null : { label: t.termFact, value: cheapest.term },
    warrantyInstallation === '' ? null : { label: t.warrantyFact, value: warrantyInstallation },
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
      <StepsTimeline warranty={settings.warranty} />
      <HonestPricing installFrom={cheapest?.price ?? null} />
      <ScamAccordion />
      <Pricing prices={priceRows} rates={extras} leadHref={LEAD_ANCHOR} />
      <LeadSection
        phone={primaryPhone(settings)}
        policyHref={POLICY_HREF}
        defaultTopic="Монтаж и установка"
        {...(settings.contacts.responseTime === ''
          ? {}
          : { responseTime: settings.contacts.responseTime })}
      />
    </>
  );
}
