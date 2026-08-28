import type { Metadata } from 'next';

import { listPublished } from '@/server/repo/articles';
import {
  ARTICLES_CATEGORY_PARAM,
  ARTICLES_PATH,
  articlePath,
  buildPageMetadata,
} from '@/shared/seo';
import { env } from '@/shared/config/env';
import { ArticleList } from '@/widgets/article';
import { Breadcrumbs } from '@/widgets/breadcrumbs';

import { inCity } from '../_lib/city';
import { loadSettings } from '../_lib/settings';
import { bazaZnaniyContent as t } from './content';

/**
 * Листинг Базы знаний — вход в информационный кластер (docs/SEO.md §1).
 *
 * Данные читает страница и передаёт блоку пропсами: виджеты в базу не ходят
 * (docs/ORCHESTRATION.md). Фильтр рубрик работает адресом, а не скриптом,
 * поэтому отфильтрованный список тоже приходит из HTML (инвариант 1).
 */
export const revalidate = 3600;

type ListingSearchParams = {
  readonly [ARTICLES_CATEGORY_PARAM]?: string | string[] | undefined;
};

/** Слаг рубрики из адреса. Пустое и повторённое значение — то же, что фильтра нет. */
function categoryOf(raw: string | string[] | undefined): string | null {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

/**
 * 🔴 Канонизация рубрик — по тем же правилам, что у каталога (ADR-152).
 *
 * `?category=` порождает адреса с тем же `h1`, `title`, `description` и тем же
 * содержимым под другим углом — это ровно тот класс, ради которого каталогу
 * завели `noindex, follow` плюс `Clean-param` (ADR-109). Одного каноникала
 * здесь мало: он рекомендация, а не директива, и Яндекс его регулярно
 * игнорирует — ради чего `Clean-param` для каталога и появился.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const [raw, settings] = await Promise.all([searchParams, loadSettings()]);
  const filtered = categoryOf(raw[ARTICLES_CATEGORY_PARAM]) !== null;

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    // Каноникал всегда без параметра рубрики: вес собирается в одном месте, а
    // робот идёт по ссылкам дальше и находит сами статьи (docs/SEO.md §5).
    path: ARTICLES_PATH,
    title: t.metaTitle,
    description: t.metaDescription(inCity(settings.address.city)),
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
    ...(filtered ? { noIndex: true, follow: true } : {}),
  });
}

export default async function BazaZnaniyPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const [{ [ARTICLES_CATEGORY_PARAM]: raw }, articles] = await Promise.all([
    searchParams,
    listPublished(),
  ]);
  const category = categoryOf(raw);

  // репозиторий отдаёт DTO контракта (даты строками), блок ждёт доменный тип
  const teasers = articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    date: new Date(article.date),
    minutes: article.minutes,
    excerpt: article.excerpt,
    cover: article.cover,
  }));

  return (
    <>
      <Breadcrumbs items={[{ name: t.sectionTitle }]} siteUrl={env.SITE_URL} />
      <ArticleList
        articles={teasers}
        activeCategory={category}
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
