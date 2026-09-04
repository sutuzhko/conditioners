import type { Metadata } from 'next';

import { listPublished } from '@/server/repo/articles';
import {
  ARTICLES_CATEGORY_PARAM,
  ARTICLES_PATH,
  articlePath,
  buildPageMetadata,
} from '@/shared/seo';
import { pageNumber } from '@/shared/lib/paging';
import { env } from '@/shared/config/env';
import { ArticleList, selectArticles } from '@/widgets/article';
import type { ArticleTeaser } from '@/widgets/article';
import { Breadcrumbs } from '@/widgets/breadcrumbs';

import { inCity } from '../_lib/city';
import { loadSettings } from '../_lib/settings';
import { ARTICLES_PAGE_PARAM, bazaZnaniyContent as t } from './content';

/**
 * Листинг Базы знаний — вход в информационный кластер (docs/SEO.md §1).
 *
 * Данные читает страница и передаёт блоку пропсами: виджеты в базу не ходят
 * (docs/ORCHESTRATION.md). И фильтр рубрик, и разбивка на страницы работают
 * адресом, а не скриптом, поэтому отфильтрованный список тоже приходит из
 * HTML (инвариант 1).
 */
export const revalidate = 3600;

type ListingSearchParams = {
  readonly [ARTICLES_CATEGORY_PARAM]?: string | string[] | undefined;
  readonly [ARTICLES_PAGE_PARAM]?: string | string[] | undefined;
};

/** Единственное значение параметра. Пустое и повторённое — то же, что его нет. */
function single(raw: string | string[] | undefined): string | null {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

/** Статьи из репозитория (даты строками) в доменный вид, который ждёт блок. */
function toTeasers(articles: Awaited<ReturnType<typeof listPublished>>): readonly ArticleTeaser[] {
  return articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    date: new Date(article.date),
    minutes: article.minutes,
    excerpt: article.excerpt,
    cover: article.cover,
  }));
}

/**
 * 🔴 Канонизация рубрик — по тем же правилам, что у каталога (ADR-152).
 *
 * `?category=` порождает адреса с тем же `h1`, `title`, `description` и тем же
 * содержимым под другим углом — это ровно тот класс, ради которого каталогу
 * завели `noindex, follow` плюс `Clean-param` (ADR-109). Одного каноникала
 * здесь мало: он рекомендация, а не директива, и Яндекс его регулярно
 * игнорирует — ради чего `Clean-param` для каталога и появился.
 *
 * 🔴 Разбивка — исключение, и по той же причине, что в каталоге: у `?page=2`
 * содержимое действительно другое, и `noindex` на ней выбросил бы из индекса
 * половину раздела. Каноникал указывает на реально показанную страницу:
 * `?page=99` прижимается к последней, и обещать роботу несуществующий адрес
 * нельзя (docs/SEO.md §5).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const [raw, settings, articles] = await Promise.all([
    searchParams,
    loadSettings(),
    listPublished(),
  ]);

  const category = single(raw[ARTICLES_CATEGORY_PARAM]);
  const { page } = selectArticles({
    articles: toTeasers(articles),
    category,
    page: pageNumber(single(raw[ARTICLES_PAGE_PARAM]) ?? undefined),
  });

  // Каноникал всегда без параметра рубрики: вес собирается в одном месте, а
  // робот идёт по ссылкам дальше и находит сами статьи (docs/SEO.md §5).
  const canonical =
    category !== null || page.page === 1
      ? ARTICLES_PATH
      : `${ARTICLES_PATH}?${ARTICLES_PAGE_PARAM}=${page.page}`;

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: canonical,
    title: t.metaTitle,
    description: t.metaDescription(inCity(settings.address.city)),
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
    ...(category !== null ? { noIndex: true, follow: true } : {}),
  });
}

export default async function BazaZnaniyPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const [raw, articles] = await Promise.all([searchParams, listPublished()]);
  const category = single(raw[ARTICLES_CATEGORY_PARAM]);

  return (
    <>
      <Breadcrumbs items={[{ name: t.sectionTitle }]} siteUrl={env.SITE_URL} />
      <ArticleList
        articles={toTeasers(articles)}
        activeCategory={category}
        activePage={pageNumber(single(raw[ARTICLES_PAGE_PARAM]) ?? undefined)}
        basePath={ARTICLES_PATH}
        // рубрика переживает переход по страницам, номер страницы — нет:
        // при смене рубрики выдача другая, и вторая страница прежней не значит ничего
        {...(category === null ? {} : { pagerQuery: { [ARTICLES_CATEGORY_PARAM]: category } })}
        categoryHref={(slug) =>
          slug === null
            ? ARTICLES_PATH
            : { pathname: ARTICLES_PATH, query: { [ARTICLES_CATEGORY_PARAM]: slug } }
        }
        // Адрес статьи — объектом: `typedRoutes` выводит параметр
        // динамического маршрута только из литерала в самом `<Link href>`,
        // а через пропс-функцию тип маршрута остаётся неразрешённым.
        articleHref={(slug) => ({ pathname: articlePath(slug) })}
      />
    </>
  );
}
