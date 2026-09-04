import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { findById } from '@/server/repo/articles';

import { ArticleEditor } from '../ArticleEditor';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  /* 🔴 Для чужого база не читается вовсе — и рубеж здесь не бросает отказ, а
     возвращает общий заголовок. `forbidden()` в метаданных не спасает: Next
     успевает вычислить их до того, как отказ доходит до ответа, и название
     уезжает в тело 403 (issue #524). Не прочитанное не утечёт ни при каком
     порядке потока. */
  const session = await getAdminSession();
  if (session === null || !isOwner(session)) return { title: 'Статья' };

  const { id } = await params;
  const article = await findById(id);

  return { title: article?.title ?? 'Статья' };
}

/** Правка статьи. */
export default async function AdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

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
