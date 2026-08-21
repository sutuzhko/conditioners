import type { Metadata } from 'next';

import { reviewSchema } from '@/entities/review/model';
import { listApproved } from '@/server/repo/reviews';
import { POLICY_HREF } from '@/shared/config/nav';
import { LeadSection } from '@/widgets/lead';
import { Reviews } from '@/widgets/reviews';

import { inCity } from '../_lib/city';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro } from '../_ui/PageIntro';
import { reviewsContent as t } from './content';

/**
 * Отзывы — страница доверия перед заявкой (docs/SEO.md §1). Список приходит из
 * базы, форма отзыва живёт внутри блока; страница только читает данные и
 * задаёт свой `h1` (инвариант 4).
 *
 * Форма заявки стоит и здесь: она нужна на каждой странице кластера
 * (docs/SEO.md §1), и на неё ведёт кнопка в шапке.
 */
export const revalidate = 3600;

const PATH = '/reviews';

/** Якорь формы отзыва внутри блока: на него ведёт кнопка из вводной части. */
const REVIEW_FORM_HREF = '#ostavit-otzyv';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  const place = inCity(settings.address.city);

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(place),
    description: t.metaDescription(place),
  });
}

export default async function OtzyvyPage() {
  const [rawReviews, settings] = await Promise.all([listApproved(), loadSettings()]);
  const reviews = rawReviews.map((dto) => reviewSchema.parse(dto));

  return (
    <>
      <PageIntro
        kicker={t.kicker}
        title={t.title}
        lead={t.lead}
        paragraphs={t.paragraphs}
        ctaHref={REVIEW_FORM_HREF}
        ctaLabel={t.cta}
      />
      <Reviews reviews={reviews} policyHref={POLICY_HREF} />
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
