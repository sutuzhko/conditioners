import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { LeadContextSnapshot } from '@/features/lead-form';
import { formatMoney } from '@/shared/lib/format';
import { env } from '@/shared/config/env';
import { LEAD_ANCHOR } from '@/shared/config/nav';
import {
  CATALOG_PATH,
  JsonLd,
  buildPageMetadata,
  buildProductJsonLd,
  productPath,
} from '@/shared/seo';
import { Breadcrumbs } from '@/widgets/breadcrumbs';
import { ProductDetails } from '@/widgets/catalog';

import { inCity } from '../../_lib/city';
import { loadSettings } from '../../_lib/settings';
import { loadCatalog, loadProduct } from '../_data';
import { catalogPageContent as t } from '../content';

/**
 * Страница модели (ADR-109) — посадочная под товарные запросы.
 *
 * 🔴 Цена, характеристики и разметка приходят в HTML с сервера: товарный
 * сниппет собирается из того же, что видит человек (инварианты 1 и 9).
 */
export const revalidate = 3600;

type ProductParams = { readonly slug: string };

/** Статические адреса — по моделям в продаже; новая соберётся по запросу. */
export async function generateStaticParams(): Promise<ProductParams[]> {
  const products = await loadCatalog();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ProductParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([loadProduct(slug), loadSettings()]);

  // Неизвестный или снятый с продажи адрес: страница отдаст 404.
  if (product === null) return {};

  const place = inCity(settings.address.city);
  const price = getActivePrice(product, new Date());

  /* 🔴 Свой заголовок владельца главнее шаблона: он пишет его как раз для
     выдачи, и дописывать к нему бренд — значит ломать выбранную длину. */
  const ownTitle = product.seoTitle === null ? '' : product.seoTitle.trim();
  const ownDescription = product.seoDescription === null ? '' : product.seoDescription.trim();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: productPath(product.slug),
    title: ownTitle === '' ? t.modelTitle(product.name, place) : ownTitle,
    description:
      ownDescription === ''
        ? t.modelDescription({
            name: product.name,
            badge: product.badge,
            areaMax: product.areaMax,
            // цена в описании — действующая: расходиться с ценой на странице ей нельзя
            price: formatMoney(price.currentPrice),
            place,
          })
        : ownDescription,
    siteName: settings.company.name,
    image: product.photos[0]?.url ?? settings.seo.ogImage,
    ...(ownTitle === '' ? { titleSuffix: settings.seo.titleSuffix } : {}),
  });
}

export default async function ProductPage({ params }: { params: Promise<ProductParams> }) {
  /* Момент рендера — один на страницу: цена в карточке и цена в разметке
     считаются от одной точки (ADR-101). */
  const now = new Date();

  const { slug } = await params;
  const [product, settings] = await Promise.all([loadProduct(slug), loadSettings()]);

  /* Скрытая модель страницы не имеет: адрес мог остаться в закладке или в
     индексе, и 404 честнее карточки товара, которого нет в продаже. */
  if (product === null) notFound();

  const price = getActivePrice(product, now);

  /* Разметка товара — из тех же данных и той же цены, что рисуют страницу.
     Адрес свой: `Offer` без `url` для поисковика — перечисление, а не товар
     (ADR-109). */
  const jsonLd = buildProductJsonLd({
    siteUrl: env.SITE_URL,
    path: productPath(product.slug),
    product,
    price,
  });

  return (
    <>
      {/* Модель, с карточки которой человек уйдёт в форму: снимок цены на
          момент показа страницы. Считается тем же `getActivePrice`, что
          рисует цену на экране, — снимок совпадает с ней по построению. */}
      <LeadContextSnapshot
        model={{
          slug: product.slug,
          name: product.name,
          price: price.currentPrice,
          oldPrice: price.oldPrice,
        }}
      />
      <JsonLd nodes={[jsonLd]} />
      <Breadcrumbs
        items={[{ name: t.sectionTitle, path: CATALOG_PATH }, { name: product.name }]}
        siteUrl={env.SITE_URL}
      />
      <ProductDetails
        product={product}
        orderHref={`/${LEAD_ANCHOR}`}
        catalogHref={CATALOG_PATH}
        now={now}
        specDictionary={settings.specs}
      />
    </>
  );
}
