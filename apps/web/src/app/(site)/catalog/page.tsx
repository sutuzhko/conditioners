import type { Metadata } from 'next';

import { priceRowSchema } from '@/entities/price/model';
import { productSchema } from '@/entities/product/model';
import { getPrices } from '@/server/repo/prices';
import { listVisible } from '@/server/repo/products';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';
import { formatMoney } from '@/shared/lib/format';
import { Catalog } from '@/widgets/catalog';
import { LeadSection } from '@/widgets/lead';

import { inCity } from '../_lib/city';
import { cheapestPriceRow, productPriceFrom } from '../_lib/prices';
import { pageMetadata } from '../_lib/seo';
import { loadSettings, primaryPhone } from '../_lib/settings';
import { PageIntro, type PageIntroFact } from '../_ui/PageIntro';
import { catalogContent as t } from './content';

/**
 * Каталог моделей — посадочная под «купить кондиционер в Туле» (docs/SEO.md §1).
 *
 * Данные читает страница и передаёт блокам пропсами: виджеты в базу не ходят
 * (docs/ORCHESTRATION.md). Собственный `h1` у страницы один, вставленные блоки
 * начинают со своих `h2` (инвариант 4).
 */
export const revalidate = 3600;

const PATH = '/catalog';

export async function generateMetadata(): Promise<Metadata> {
  const [settings, rawProducts] = await Promise.all([loadSettings(), listVisible()]);
  const products = rawProducts.map((dto) => productSchema.parse(dto));
  const from = productPriceFrom(products);

  return pageMetadata({
    path: PATH,
    title: t.metaTitle(inCity(settings.address.city)),
    description: t.metaDescription(
      inCity(settings.address.city),
      from === null ? null : formatMoney(from),
    ),
  });
}

export default async function KatalogPage() {
  const [rawProducts, { prices }, settings] = await Promise.all([
    listVisible(),
    getPrices(),
    loadSettings(),
  ]);

  // репозитории отдают DTO контракта (даты строками), виджеты ждут доменный тип
  const products = rawProducts.map((dto) => productSchema.parse(dto));
  const priceRows = prices.map((row) => priceRowSchema.parse(row));

  const equipmentFrom = productPriceFrom(products);
  const cheapestInstall = cheapestPriceRow(priceRows);

  // цифры «до первой прокрутки» — только те, что есть в данных (инвариант 8)
  const maybeFacts: readonly (PageIntroFact | null)[] = [
    equipmentFrom === null
      ? null
      : { label: t.equipmentFact, value: t.from(formatMoney(equipmentFrom)) },
    cheapestInstall === null
      ? null
      : { label: t.installFact, value: t.from(formatMoney(cheapestInstall.price)) },
    cheapestInstall === null ? null : { label: t.termFact, value: cheapestInstall.term },
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
      <Catalog products={products} orderHref={LEAD_ANCHOR} />
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
