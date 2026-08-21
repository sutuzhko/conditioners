import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { findPublishedBySlug, listPublished } from '@/server/repo/articles';
import {
  ARTICLES_PATH,
  JsonLd,
  articlePath,
  buildArticleJsonLd,
  buildPageMetadata,
} from '@/shared/seo';
import { env } from '@/shared/config/env';
import { LEAD_ANCHOR } from '@/shared/config/nav';
import { ArticleView } from '@/widgets/article';
import type { ArticleLink } from '@/widgets/article';
import { Breadcrumbs } from '@/widgets/breadcrumbs';

import { loadSettings } from '../../_lib/settings';
import { bazaZnaniyContent as t } from '../content';

/**
 * Страница статьи (docs/SEO.md §1) — длинный хвост информационных запросов.
 *
 * 🔴 Текст статьи приходит в HTML с сервера: статьи существуют ради поиска,
 * и робот, не дождавшийся JavaScript, не должен увидеть пустую страницу
 * (инвариант 1). Разметку статьи разбирает домен, рисует виджет.
 */
export const revalidate = 3600;

/**
 * Куда статья ведёт дальше (docs/SEO.md §5, перелинковка): анкор называет
 * раздел, а не «подробнее». После ADR-049 коммерческие разделы — секции
 * главной, поэтому ссылки ведут на её якоря; `typedRoutes` проверяет путь
 * до решётки, и ссылка на несуществующий маршрут не соберётся.
 */
const COMMERCIAL_LINKS: readonly ArticleLink[] = [
  { label: t.catalogLink, href: '/#catalog' },
  { label: t.installationLink, href: '/#installation' },
];

type ArticleParams = { readonly slug: string };

/** Статические адреса — по опубликованным статьям; новая соберётся по запросу. */
export async function generateStaticParams(): Promise<ArticleParams[]> {
  const articles = await listPublished();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticleParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [article, settings] = await Promise.all([findPublishedBySlug(slug), loadSettings()]);

  // Неизвестный слаг: страница отдаст 404, метаданным нечего описывать.
  if (article === null) return {};

  // 🔴 Свой заголовок статьи главнее шаблона: владелец пишет его как раз для
  // выдачи, и дописывать к нему бренд — значит ломать выбранную им длину.
  const ownTitle = article.seoTitle === null ? '' : article.seoTitle.trim();

  return buildPageMetadata({
    siteUrl: env.SITE_URL,
    path: articlePath(article.slug),
    title: ownTitle === '' ? article.title : ownTitle,
    description: article.seoDescription ?? article.excerpt,
    type: 'article',
    siteName: settings.company.name,
    image: article.cover ?? settings.seo.ogImage,
    ...(ownTitle === '' ? { titleSuffix: settings.seo.titleSuffix } : {}),
  });
}

export default async function ArticlePage({ params }: { params: Promise<ArticleParams> }) {
  const { slug } = await params;
  const [article, settings] = await Promise.all([findPublishedBySlug(slug), loadSettings()]);

  if (article === null) notFound();

  const jsonLd = buildArticleJsonLd({
    siteUrl: env.SITE_URL,
    path: articlePath(article.slug),
    article: {
      title: article.title,
      excerpt: article.excerpt,
      seoDescription: article.seoDescription,
      date: new Date(article.date),
      updatedAt: new Date(article.updatedAt),
      cover: article.cover,
    },
    hasOrganization: settings.company.name.trim() !== '',
  });

  return (
    <>
      {jsonLd === null ? null : <JsonLd nodes={[jsonLd]} />}
      <ArticleView
        article={{
          title: article.title,
          category: article.category,
          date: new Date(article.date),
          minutes: article.minutes,
          cover: article.cover,
          body: article.body,
        }}
        breadcrumbs={
          <Breadcrumbs
            items={[{ name: t.sectionTitle, path: ARTICLES_PATH }, { name: article.title }]}
            siteUrl={env.SITE_URL}
          />
        }
        listHref={ARTICLES_PATH}
        leadHref={`/${LEAD_ANCHOR}`}
        links={COMMERCIAL_LINKS}
      />
    </>
  );
}
