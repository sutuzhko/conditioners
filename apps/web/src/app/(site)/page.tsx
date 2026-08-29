import { listFeatured, listVisible } from '@/server/repo/products';
import { listApproved } from '@/server/repo/reviews';
import { listPublished } from '@/server/repo/articles';
import { getPrices } from '@/server/repo/prices';
import { getCityWeather } from '@/server/weather';
import { productSchema } from '@/entities/product/model';
import { reviewSchema } from '@/entities/review/model';
import { priceRowSchema } from '@/entities/price/model';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import {
  DEFAULT_CATALOG_QUERY,
  catalogSearchParams,
  withCatalogCompare,
} from '@/entities/product/lib/catalogQuery';
import { env } from '@/shared/config/env';
import {
  CATALOG_PATH,
  JsonLd,
  buildCatalogItemListJsonLd,
  buildFaqPageJsonLd,
  buildLocalBusinessJsonLd,
  productPath,
} from '@/shared/seo';
import { catalogText } from '@/widgets/catalog';
import { Hero, toPickerProduct } from '@/widgets/hero';
import { TrustStrip, Services, WhyUs } from '@/widgets/trust';
import { COMPARE_ANCHOR, Catalog } from '@/widgets/catalog';
import { SavingsBlock, StepsTimeline } from '@/widgets/installation';
import { Pricing } from '@/widgets/pricing';
import { HonestPricing } from '@/widgets/honesty';
import { Diagnostics } from '@/widgets/service';
import { Reviews } from '@/widgets/reviews';
import { KnowledgeTeaser } from '@/widgets/knowledge';
import { Faq, buildFaqItems } from '@/widgets/faq';
import { Contacts } from '@/widgets/contacts';
import { LeadSection } from '@/widgets/lead';
import { AnchorSync } from '@/features/anchor-sync';
import type { Metadata } from 'next';

import { ScrollTop } from '@/features/scroll-top';
import { ReminderForm } from '@/features/reminder-form';
import { buildPageMetadata } from '@/shared/seo';
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

/**
 * Метаданные главной — из группы настроек `seo` (инвариант 5): владелец правит
 * заголовок и описание из админки, код ничего не сочиняет. Пустые поля
 * сборщик отбрасывает, и до заполнения действует запасной title каркаса —
 * вместе с noindex по неготовности настроек (ADR-090).
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: '/',
    title: settings.seo.homeTitle,
    description: settings.seo.homeDescription,
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
  });
}

export default async function HomePage() {
  /* Момент рендера — один на страницу: серверная разметка, JSON-LD и
     клиентская гидратация подбора считают скидку от одной и той же точки.
     Часовое окно ISR для истёкшей скидки — осознанный допуск (ADR-101). */
  const now = new Date();

  /* Витрина и ассортимент — разные вопросы (ADR-109): на главную идёт то,
     что владелец вынес флагом `featured`, а подбор по площади в первом экране
     по-прежнему выбирает из всего, что есть в продаже. */
  const [rawProducts, rawFeatured, { prices, extras }, settings, reviews, articles] =
    await Promise.all([
      listVisible(),
      listFeatured(),
      getPrices(),
      loadSettings(),
      listApproved(),
      listPublished(),
    ]);

  // репозитории отдают DTO контракта (даты строками), виджеты ждут доменный тип
  const products = rawProducts.map((dto) => productSchema.parse(dto));
  /* 🔴 Первому экрану уезжает проекция, а не каталог целиком: `HeroPicker`
     клиентский, и всё, что ему передано, сериализуется в HTML — то есть ровно
     туда, где считается LCP (BUGS, issue #87). */
  const pickerProducts = products.map(toPickerProduct);
  const featured = rawFeatured.map((dto) => productSchema.parse(dto));
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
  // срок из той же строки прайса, что и минимальная цена: они описывают один монтаж
  const installTerm = priceRows.find((row) => row.price === installFrom)?.term ?? null;

  const { warranty, contacts } = settings;
  const phone = contacts.phones[0] ?? '';

  /* Погода — после основных данных и отдельным запросом: она украшает первый
     экран, но не имеет права его задерживать. Сервис недоступен — чипа нет,
     страница собирается как обычно (docs/CLAUDE.md, «Безопасность»). */
  const weather = await getCityWeather(settings.geo);

  /* Плашка над заголовком — короткая строка о выезде из настроек, а не из кода.
     🔴 Именно `promise`, а не полный список городов: перечисление не помещалось
     в капсулу и занимало самую дорогую строку страницы (ADR-126). Список
     остаётся в контактах и в разметке зоны обслуживания. Пусто — плашки нет:
     подставить сюда `served` значило бы вернуть ту же поломку. */
  const heroNote = settings.area.promise;

  /* Разметка собирается из тех же данных, что рисуют страницу: вопросы FAQ —
     тот же вызов `buildFaqItems`, что у виджета, отзывы — те же одобренные.
     Расхождение разметки и видимого текста — основание для санкций
     (инвариант 9), и единственный источник делает его невозможным. */
  const faqItems = buildFaqItems({ installFrom, installTerm, warranty });

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
     уходит и в разметку, и в блок (инвариант 9). Пункты списка ссылаются на
     страницы моделей, а не на якорь секции (ADR-109). */
  const catalogList = buildCatalogItemListJsonLd({
    siteUrl: env.SITE_URL,
    name: catalogText.title,
    items: featured.map((product) => ({
      product,
      price: getActivePrice(product, now),
      path: productPath(product.slug),
    })),
  });

  /* Сравнение живёт на странице каталога и в её адресе (ADR-109): с витрины
     «Сравнить» уводит туда, где модель уже отмечена. Имя параметра собирает
     домен, а не строка здесь. */
  const compareHref = (
    slug: string,
  ): { pathname: string; query: Record<string, string>; hash: string } => ({
    pathname: CATALOG_PATH,
    query: catalogSearchParams(withCatalogCompare(DEFAULT_CATALOG_QUERY, slug)),
    hash: COMPARE_ANCHOR,
  });

  return (
    <>
      <JsonLd nodes={[business, catalogList, buildFaqPageJsonLd(faqItems)]} />
      {/* адрес следует за секцией, которую читают: ссылку на раздел можно
          скопировать прямо из строки браузера */}
      <AnchorSync />
      <ScrollTop />
      <Hero
        products={pickerProducts}
        now={now}
        weather={weather}
        city={settings.address.city}
        stats={settings.achievements.items}
        note={heroNote}
        leadHref={LEAD_ANCHOR}
        catalogHref="#catalog"
      >
        <TrustStrip />
      </Hero>
      <Services />
      <Catalog
        products={featured}
        orderHref={LEAD_ANCHOR}
        productHref={(slug) => ({ pathname: productPath(slug) })}
        compareHref={compareHref}
        catalogHref={CATALOG_PATH}
      />
      <SavingsBlock />
      <StepsTimeline warranty={warranty} />
      <Pricing prices={priceRows} rates={extras} />
      <HonestPricing installFrom={installFrom} />
      <Diagnostics reminder={<ReminderForm policyHref={POLICY_HREF} phone={phone} />} />
      <WhyUs warranty={warranty} />
      <Reviews reviews={approvedReviews} policyHref={POLICY_HREF} />
      <LeadSection
        phone={phone}
        policyHref={POLICY_HREF}
        // слаг → название: по слагу из адреса форма подставляет в поле
        // «Модель» название, которое человек видел в каталоге (ADR-129)
        models={products.map((product) => ({ slug: product.slug, name: product.name }))}
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
      <Faq installFrom={installFrom} installTerm={installTerm} warranty={warranty} />
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
