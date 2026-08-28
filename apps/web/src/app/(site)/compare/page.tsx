import type { Metadata } from 'next';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import {
  parseCatalogQuery,
  selectCatalogCompare,
  type RawSearchParams,
} from '@/entities/product/lib/catalogQuery';
import { LeadContextSnapshot } from '@/features/lead-form';
import { env } from '@/shared/config/env';
import { LEAD_ANCHOR } from '@/shared/config/nav';
import { CATALOG_PATH, COMPARE_PATH, buildPageMetadata } from '@/shared/seo';
import { Breadcrumbs } from '@/widgets/breadcrumbs';
import { CatalogCompare } from '@/widgets/catalog';

import { inCity } from '../_lib/city';
import { loadSettings } from '../_lib/settings';
import { PageIntro } from '../_ui/PageIntro';
import { loadCatalog } from '../catalog/_data';
import { catalogPageContent } from '../catalog/content';
import { comparePageContent as t } from './content';

/**
 * Сравнение отмеченных моделей — своя страница (ADR-121).
 *
 * 🔴 Таблица собирается на сервере и приходит в HTML готовой (инвариант 1);
 * снятие отметки и возврат в каталог — обычные ссылки, поэтому собственного
 * слоя JavaScript у страницы нет (ADR-088).
 *
 * 🔴 Имя параметра то же, что в каталоге (`?compare=slug,slug`), и разбирает
 * его тот же `parseCatalogQuery`: вторая реализация разбора адреса дороже
 * некрасивого адреса. Заодно сюда доезжает подбор — возврат открывает ту же
 * выдачу, из которой человек пришёл.
 */
export const revalidate = 3600;

/**
 * 🔴 Страница закрыта от индекса целиком (ADR-121).
 *
 * Без параметров у неё нет содержимого, а с параметрами это состояние
 * интерфейса, а не страница: решение ADR-109 про `?compare=` переехало сюда с
 * каталога вместе с самой таблицей. `follow` остаётся — робот идёт по ссылкам
 * дальше и находит карточки моделей. В карту сайта адрес не попадает.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: COMPARE_PATH,
    title: t.metaTitle,
    description: t.metaDescription(inCity(settings.address.city)),
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
    noIndex: true,
    follow: true,
  });
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  /* Момент рендера — один на страницу: цена в таблице и в снимке заявки
     считается от одной точки (ADR-101). */
  const now = new Date();

  const [raw, settings, products] = await Promise.all([
    searchParams,
    loadSettings(),
    loadCatalog(),
  ]);

  const query = parseCatalogQuery(raw);

  /* 🔴 Отбор идёт по всему каталогу: сравнение открывают по пересланной
     ссылке, и текущей выдачи здесь нет вовсе. Незнакомый слаг отсеивается
     молча — адрес правят руками, и отказ вместо таблицы там ничего не
     объясняет (ADR-109). */
  const compared = selectCatalogCompare(products, query.compare);

  return (
    <>
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
      <Breadcrumbs
        items={[
          { name: catalogPageContent.sectionTitle, path: CATALOG_PATH },
          { name: t.sectionTitle },
        ]}
        siteUrl={env.SITE_URL}
      />
      <PageIntro kicker={t.kicker} title={t.title} lead={t.lead} />
      <CatalogCompare
        products={compared}
        query={query}
        basePath={COMPARE_PATH}
        catalogPath={CATALOG_PATH}
        orderHref={`/${LEAD_ANCHOR}`}
        now={now}
        specDictionary={settings.specs}
      />
    </>
  );
}
