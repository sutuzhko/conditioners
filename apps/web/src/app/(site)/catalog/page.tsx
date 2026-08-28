import type { Metadata } from 'next';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { LeadContextSnapshot } from '@/features/lead-form';
import {
  CATALOG_PARAMS,
  catalogFacets,
  isCatalogViewState,
  parseCatalogQuery,
  selectCatalogCompare,
  selectCatalogPage,
  type RawSearchParams,
} from '@/entities/product/lib/catalogQuery';
import { env } from '@/shared/config/env';
import { LEAD_ANCHOR } from '@/shared/config/nav';
import {
  CATALOG_PATH,
  COMPARE_PATH,
  JsonLd,
  buildCatalogItemListJsonLd,
  buildPageMetadata,
  productPath,
} from '@/shared/seo';
import { Breadcrumbs } from '@/widgets/breadcrumbs';
import { CatalogList } from '@/widgets/catalog';

import { inCity } from '../_lib/city';
import { loadSettings } from '../_lib/settings';
import { PageIntro } from '../_ui/PageIntro';
import { loadCatalog } from './_data';
import { catalogPageContent as t } from './content';

/**
 * Каталог — всё, что в продаже (ADR-109).
 *
 * 🔴 Страница собирается на сервере вместе с фильтром: подбор работает
 * ссылками, поэтому и отфильтрованный список приходит в HTML (инвариант 1).
 * Клиентского слоя у страницы нет вовсе — ни одного килобайта в бюджете JS
 * (ADR-088).
 */
export const revalidate = 3600;

/** Ссылка на страницу модели — карту URL знает страница, а не блок. */
const productHref = (slug: string): { pathname: string } => ({ pathname: productPath(slug) });

/**
 * 🔴 Канонизация — часть решения, а не доводка (ADR-109).
 *
 * Фильтр и сортировка порождают комбинаторику адресов с одним и тем же
 * содержимым: они отдают `noindex, follow` и каноникал на чистый `/catalog` —
 * вес собирается в одном месте, а робот идёт по ссылкам дальше и находит
 * карточки моделей. `?compare=` — то же самое и по той же причине: это
 * состояние интерфейса, а не страница. Пагинация — исключение: у `?page=2`
 * содержимое действительно другое, поэтому она самоканонична и индексируема,
 * иначе модели со второй страницы не попадут в индекс вовсе. `rel=prev/next`
 * не используем: Google их не учитывает, Яндексу достаточно каноникала.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const [raw, settings, products] = await Promise.all([
    searchParams,
    loadSettings(),
    loadCatalog(),
  ]);

  const query = parseCatalogQuery(raw);
  const sideView = isCatalogViewState(query);

  /* Номер страницы берётся тот, что реально показан: `?page=99` прижимается
     к последней странице, и каноникал обязан указывать на неё, а не на
     несуществующий адрес. */
  const { page } = selectCatalogPage(products, query, new Date());
  const canonical =
    sideView || page === 1 ? CATALOG_PATH : `${CATALOG_PATH}?${CATALOG_PARAMS.page}=${page}`;

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: canonical,
    title: t.metaTitle,
    description: t.metaDescription(inCity(settings.address.city)),
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
    ...(sideView ? { noIndex: true, follow: true } : {}),
  });
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  /* Момент рендера — один на страницу: скидка в карточках, в фильтре «со
     скидкой» и в разметке считается от одной точки (ADR-101). */
  const now = new Date();

  /* 🔴 Настройки странице больше не нужны: справочник характеристик уехал
     вместе с таблицей сравнения на `/compare` (ADR-121), а ни одного другого
     факта о компании карточки каталога не рассказывают — шапку и футер
     собирает layout. Город для описания читает `generateMetadata`. */
  const [raw, products] = await Promise.all([searchParams, loadCatalog()]);

  const query = parseCatalogQuery(raw);
  const page = selectCatalogPage(products, query, now);

  /* 🔴 Сравнение отбирается по всему каталогу, а не по текущей странице
     выдачи: модель, отмеченную на второй странице, ни фильтр, ни листание не
     имеют права выкинуть из отметок (ADR-109). Незнакомый слаг отсеивается
     здесь же — молча, адрес правят руками. */
  const compared = selectCatalogCompare(products, query.compare);

  /* Разметка списка — те же модели и та же цена, что нарисованы карточками:
     `getActivePrice` считается один раз на модель и уходит и в разметку, и в
     блок (инвариант 9). Пункты ссылаются на страницы моделей — без своего
     адреса `Offer` остаётся перечислением, а не товаром (ADR-109). */
  const itemList = buildCatalogItemListJsonLd({
    siteUrl: env.SITE_URL,
    name: t.metaTitle,
    items: page.items.map((product) => ({
      product,
      price: getActivePrice(product, now),
      path: productPath(product.slug),
    })),
  });

  return (
    <>
      <JsonLd nodes={[itemList]} />
      {/* Отмеченные модели уезжают вместе с заявкой: снимок цен на момент
          показа страницы, а не слаги — по слагу уже не восстановить цену,
          которую человек видел перед звонком. Компонент ничего не рисует. */}
      <LeadContextSnapshot
        liked={compared.map((product) => {
          const price = getActivePrice(product, now);
          return {
            slug: product.slug,
            name: product.name,
            price: price.currentPrice,
            oldPrice: price.oldPrice,
          };
        })}
      />
      <Breadcrumbs items={[{ name: t.sectionTitle }]} siteUrl={env.SITE_URL} />
      <PageIntro kicker={t.kicker} title={t.title} lead={t.lead} />
      <CatalogList
        page={page}
        facets={catalogFacets(products)}
        query={query}
        compared={compared.map((product) => product.slug)}
        basePath={CATALOG_PATH}
        comparePath={COMPARE_PATH}
        productHref={productHref}
        orderHref={`/${LEAD_ANCHOR}`}
        now={now}
      />
    </>
  );
}
