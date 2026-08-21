import { listVisible } from '@/server/repo/products';
import { listApproved } from '@/server/repo/reviews';
import { listPublished } from '@/server/repo/articles';
import { getPrices } from '@/server/repo/prices';
import { getAll } from '@/server/repo/settings';
import { productSchema } from '@/entities/product/model';
import { reviewSchema } from '@/entities/review/model';
import { priceRowSchema } from '@/entities/price/model';
import { settingSchemas } from '@/entities/settings/model';
import { Hero } from '@/widgets/hero';
import { TrustStrip, Services, WhyUs } from '@/widgets/trust';
import { Catalog } from '@/widgets/catalog';
import { SavingsBlock, StepsTimeline } from '@/widgets/installation';
import { Pricing } from '@/widgets/pricing';
import { HonestPricing } from '@/widgets/honesty';
import { Diagnostics } from '@/widgets/service';
import { Reviews } from '@/widgets/reviews';
import { KnowledgeTeaser } from '@/widgets/knowledge';
import { Faq } from '@/widgets/faq';
import { Contacts } from '@/widgets/contacts';
import { LeadSection } from '@/widgets/lead';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';

/**
 * Главная. Собирается из блоков; данные читает страница и передаёт пропсами —
 * виджеты в базу не ходят (docs/ORCHESTRATION.md).
 *
 * Порядок секций — из прототипа: сначала подбор и доверие, затем товар,
 * затем цена и процесс, и только потом форма. Человек должен понимать,
 * за что платит, прежде чем его просят оставить телефон.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const [rawProducts, { prices, extras }, settings, reviews, articles] = await Promise.all([
    listVisible(),
    getPrices(),
    getAll(),
    listApproved(),
    listPublished(),
  ]);

  // репозитории отдают DTO контракта (даты строками), виджеты ждут доменный тип
  const products = rawProducts.map((dto) => productSchema.parse(dto));
  const priceRows = prices.map((row) => priceRowSchema.parse(row));
  const approvedReviews = reviews.map((dto) => reviewSchema.parse(dto));

  // Список статей приходит без тела — доменная схема требует его целиком,
  // поэтому тизер собирается из нужных полей напрямую, с приведением даты.
  const articleTeasers = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    date: new Date(a.date),
    minutes: a.minutes,
    excerpt: a.excerpt,
    cover: a.cover,
  }));

  // цена в заголовке «честно о цене» — из прайса, а не из вёрстки (инвариант 8)
  const installFrom = priceRows.length === 0 ? null : Math.min(...priceRows.map((r) => r.price));

  const warranty = settingSchemas.warranty.safeParse(settings.warranty);
  const address = settingSchemas.address.safeParse(settings.address);
  const area = settingSchemas.area.safeParse(settings.area);
  const geo = settingSchemas.geo.safeParse(settings.geo);
  const contacts = settingSchemas.contacts.safeParse(settings.contacts);
  const phone = contacts.success ? (contacts.data.phones[0] ?? '') : '';

  return (
    <>
      <Hero products={products} leadHref={LEAD_ANCHOR} catalogHref="#catalog" />
      <TrustStrip />
      <Services />
      <Catalog products={products} orderHref={LEAD_ANCHOR} />
      <SavingsBlock />
      <StepsTimeline {...(warranty.success ? { warranty: warranty.data } : {})} />
      <Pricing prices={priceRows} rates={extras} leadHref={LEAD_ANCHOR} />
      <HonestPricing installFrom={installFrom} />
      <Diagnostics leadHref={LEAD_ANCHOR} />
      <WhyUs {...(warranty.success ? { warranty: warranty.data } : {})} />
      <Reviews reviews={approvedReviews} policyHref={POLICY_HREF} />
      <LeadSection
        phone={phone}
        policyHref={POLICY_HREF}
        {...(contacts.success && contacts.data.responseTime !== ''
          ? { responseTime: contacts.data.responseTime }
          : {})}
      />
      <KnowledgeTeaser
        articles={articleTeasers}
        articleHref={(slug) => `/knowledge/${slug}`}
        allHref="/knowledge"
      />
      <Faq installFrom={installFrom} {...(warranty.success ? { warranty: warranty.data } : {})} />
      {contacts.success && address.success && area.success ? (
        <Contacts
          contacts={contacts.data}
          address={address.data}
          area={area.data}
          {...(geo.success ? { geo: geo.data } : {})}
          leadHref={LEAD_ANCHOR}
        />
      ) : null}
    </>
  );
}
