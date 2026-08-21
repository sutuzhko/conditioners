import type { Metadata } from 'next';

import { listPublished } from '@/server/repo/articles';
import { ARTICLES_PATH, articlePath, buildPageMetadata } from '@/shared/seo';
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

/** Имя параметра фильтра. Значение — слаг рубрики: `?rubrika=vybor`. */
const CATEGORY_PARAM = 'rubrika';

type ListingSearchParams = { readonly [CATEGORY_PARAM]?: string | string[] | undefined };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    // 🔴 Каноникал всегда без параметра рубрики: отфильтрованный список — это
    // тот же раздел под другим углом, и вторым URL в индексе он не нужен
    // (docs/SEO.md §5).
    path: ARTICLES_PATH,
    title: t.metaTitle,
    description: t.metaDescription(inCity(settings.address.city)),
    titleSuffix: settings.seo.titleSuffix,
    siteName: settings.company.name,
    image: settings.seo.ogImage,
  });
}

export default async function BazaZnaniyPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const [{ [CATEGORY_PARAM]: raw }, articles] = await Promise.all([searchParams, listPublished()]);
  const category = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;

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
          slug === null ? ARTICLES_PATH : { pathname: ARTICLES_PATH, query: { rubrika: slug } }
        }
        // Адрес статьи — объектом: `typedRoutes` выводит параметр
        // динамического маршрута только из литерала в самом `<Link href>`,
        // а через пропс-функцию тип маршрута остаётся неразрешённым.
        articleHref={(slug) => ({ pathname: articlePath(slug) })}
      />
    </>
  );
}
