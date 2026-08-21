import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { findById } from '@/server/repo/articles';

import { ArticleEditor } from '../ArticleEditor';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await findById(id);

  return { title: article?.title ?? 'Статья' };
}

/** Правка статьи. */
export default async function AdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await findById(id);

  if (article === null) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/knowledge' }}>
            ← База знаний
          </Link>
          <h1 className={styles.title}>{article.title}</h1>
        </div>
      </header>

      <ArticleEditor
        id={article.id}
        cover={article.cover}
        values={{
          title: article.title,
          category: article.category,
          // День по времени Тулы: репозиторий уже отдаёт его строкой.
          date: article.date.slice(0, 10),
          minutes: String(article.minutes),
          excerpt: article.excerpt,
          body: article.body,
          published: article.published,
          slug: article.slug,
          seoTitle: article.seoTitle ?? '',
          seoDescription: article.seoDescription ?? '',
        }}
      />
    </div>
  );
}
