import type { Metadata } from 'next';

import { priceRowSchema } from '@/entities/price/model';
import { getPrices } from '@/server/repo/prices';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';
import { formatMoney } from '@/shared/lib/format';
import { HonestPricing } from '@/widgets/honesty';
import { LeadSection } from '@/widgets/lead';
import { Pricing } from '@/widgets/pricing';

import { inCity } from '../_lib/city';
import { cheapestPriceRow, installPriceFrom } from '../_lib/prices';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro, type PageIntroFact } from '../_ui/PageIntro';
import { pricesContent as t } from './content';

/**
 * Цены на монтаж — посадочная под «сколько стоит установить кондиционер»
 * (docs/SEO.md §1). Прайс и калькулятор приходят из данных, страница только
 * раздаёт их блокам (docs/ORCHESTRATION.md).
 */
export const revalidate = 3600;

const PATH = '/prices';

export async function generateMetadata(): Promise<Metadata> {
  const [settings, { prices }] = await Promise.all([loadSettings(), getPrices()]);
  const from = installPriceFrom(prices.map((row) => priceRowSchema.parse(row)));
  const place = inCity(settings.address.city);

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(place),
    description: t.metaDescription(place, from === null ? null : formatMoney(from)),
  });
}

export default async function CenyPage() {
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
      <Pricing prices={priceRows} rates={extras} leadHref={LEAD_ANCHOR} />
      <HonestPricing installFrom={cheapest?.price ?? null} />
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
