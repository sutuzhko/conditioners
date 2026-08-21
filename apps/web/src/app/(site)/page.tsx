import { listVisible } from '@/server/repo/products';
import { listApproved } from '@/server/repo/reviews';
import { listPublished } from '@/server/repo/articles';
import { getPrices } from '@/server/repo/prices';
import { getCityWeather } from '@/server/weather';
import { productSchema } from '@/entities/product/model';
import { reviewSchema } from '@/entities/review/model';
import { priceRowSchema } from '@/entities/price/model';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { env } from '@/shared/config/env';
import {
  JsonLd,
  buildCatalogItemListJsonLd,
  buildFaqPageJsonLd,
  buildLocalBusinessJsonLd,
} from '@/shared/seo';
import { catalogText } from '@/widgets/catalog';
import { Hero } from '@/widgets/hero';
import { TrustStrip, Services, WhyUs } from '@/widgets/trust';
import { Catalog } from '@/widgets/catalog';
import { SavingsBlock, StepsTimeline } from '@/widgets/installation';
import { Pricing } from '@/widgets/pricing';
import { HonestPricing } from '@/widgets/honesty';
import { Diagnostics } from '@/widgets/service';
import { Reviews } from '@/widgets/reviews';
import { KnowledgeTeaser } from '@/widgets/knowledge';
import { Faq, buildFaqItems } from '@/widgets/faq';
import { Contacts } from '@/widgets/contacts';
import { LeadSection } from '@/widgets/lead';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';

import { loadSettings } from './_lib/settings';

/**
 * Лендинг. Собирается из блоков; данные читает страница и передаёт пропсами —
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
    loadSettings(),
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

  const { warranty, contacts } = settings;
  const phone = contacts.phones[0] ?? '';

  /* Погода — после основных данных и отдельным запросом: она украшает первый
     экран, но не имеет права его задерживать. Сервис недоступен — чипа нет,
     страница собирается как обычно (docs/CLAUDE.md, «Безопасность»). */
  const weather = await getCityWeather(settings.geo);

  /* Разметка собирается из тех же данных, что рисуют страницу: вопросы FAQ —
     тот же вызов `buildFaqItems`, что у виджета, отзывы — те же одобренные.
     Расхождение разметки и видимого текста — основание для санкций
     (инвариант 9), и единственный источник делает его невозможным. */
  const faqItems = buildFaqItems({ installFrom, warranty });

  const business = buildLocalBusinessJsonLd({
    siteUrl: env.SITE_URL,
    company: settings.company,
    contacts,
    address: settings.address,
    social: settings.social,
    seo: settings.seo,
    geo: settings.geo,
    area: settings.area,
    payment: settings.payment,
    // 🔴 Только настоящие одобренные отзывы — те же, что видит посетитель
    // (инвариант 10). Пока их нет, узлов `Review` в разметке тоже нет.
    reviews: approvedReviews,
  });

  /* Витрина в разметке — те же модели и та же действующая цена, что в
     карточках: `getActivePrice` вызывается здесь ровно один раз на модель и
     уходит и в разметку, и в блок (инвариант 9). */
  const visibleProducts = products.filter((product) => product.visible);
  const catalogList = buildCatalogItemListJsonLd({
    siteUrl: env.SITE_URL,
    name: catalogText.title,
    items: visibleProducts.map((product) => ({ product, price: getActivePrice(product) })),
  });

  return (
    <>
      <JsonLd nodes={[business, catalogList, buildFaqPageJsonLd(faqItems)]} />
      <Hero products={products} weather={weather} leadHref={LEAD_ANCHOR} catalogHref="#catalog">
        <TrustStrip />
      </Hero>
      <Services />
      <Catalog products={products} orderHref={LEAD_ANCHOR} />
      <SavingsBlock />
      <StepsTimeline warranty={warranty} />
      <Pricing prices={priceRows} rates={extras} leadHref={LEAD_ANCHOR} />
      <HonestPricing installFrom={installFrom} />
      <Diagnostics leadHref={LEAD_ANCHOR} />
      <WhyUs warranty={warranty} />
      <Reviews reviews={approvedReviews} policyHref={POLICY_HREF} />
      <LeadSection
        phone={phone}
        policyHref={POLICY_HREF}
        {...(contacts.responseTime === '' ? {} : { responseTime: contacts.responseTime })}
      />
      <KnowledgeTeaser
        articles={articleTeasers}
        // Объектом, а не строкой: typedRoutes выводит параметр динамического
        // маршрута только из литерала в самом Link, а через пропс-функцию тип
        // схлопывается. Статический адрес рядом записан строкой и проверяется.
        articleHref={(slug) => ({ pathname: `/knowledge/${slug}` })}
        allHref="/knowledge"
      />
      {/* виджет собирает вопросы тем же `buildFaqItems` от тех же фактов —
          разметка выше и видимый текст здесь не могут разойтись */}
      <Faq installFrom={installFrom} warranty={warranty} />
      <Contacts
        contacts={contacts}
        address={settings.address}
        area={settings.area}
        geo={settings.geo}
        leadHref={LEAD_ANCHOR}
      />
    </>
  );
}
