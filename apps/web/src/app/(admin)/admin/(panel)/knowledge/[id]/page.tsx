import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { settingSchemas } from '@/entities/settings/model';
import {
  ArticleTabs,
  KNOWLEDGE_PATH,
  articleFormContent as texts,
  articleTabFromParam,
} from '@/features/article-form';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { findById, type ArticleDto } from '@/server/repo/articles';
import { getGroup } from '@/server/repo/settings';
import { env } from '@/shared/config/env';
import { DataBlock, FieldsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

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
  if (session === null || !isOwner(session)) return { title: texts.listTitle };

  const { id } = await params;
  const article = await findById(id);

  return { title: article?.title ?? texts.listTitle };
}

/**
 * Правка статьи — три вкладки: «Текст», «SEO», «Публикация» (issue #355).
 *
 * 🔴 Вкладка разбирается здесь, до чтения данных: страница приходит уже
 * открытой на той, что стоит в адресе (issue #340), а мусор в параметре
 * открывает первую, а не роняет раздел (#341).
 *
 * 🔴 Существование статьи решается **до** первого куска потока (issue #651).
 * Пока заготовка стояла на границе раздела, она уходила в ответ первой, и
 * `notFound()` заставал статус уже отправленным: удалённая статья отвечала
 * 200. Здесь до первого байта успевает пройти только поиск самой статьи, и
 * адрес удалённой записи отвечает честным 404. Приписка к заголовкам из
 * настроек приезжает следом, отдельным куском потока.
 */
export default async function AdminArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const selected = articleTabFromParam(tab);

  const article = await findById(id);
  if (article === null) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: KNOWLEDGE_PATH }}>
            ← {texts.listTitle}
          </Link>
          <h1 className={styles.title}>{article.title}</h1>
        </div>
      </header>

      <ArticleTabs id={article.id} active={selected} />

      <DataBlock
        skeleton={<FieldsSkeleton fields={6} />}
        title={texts.loadFailed}
        note={blockErrorNote(KNOWLEDGE_PATH)}
        surface="bare"
      >
        <ArticleForm article={article} tab={selected} />
      </DataBlock>
    </div>
  );
}

/**
 * Форма статьи — то, что приезжает отдельным куском потока.
 *
 * Приписка к заголовкам нужна превью выдачи: без неё оно показывало бы не то,
 * что соберёт страница статьи. Битая запись не должна ронять правку —
 * разбираем со схемой.
 */
async function ArticleForm({
  article,
  tab,
}: {
  readonly article: ArticleDto;
  readonly tab: ReturnType<typeof articleTabFromParam>;
}) {
  const seo = settingSchemas.seo.safeParse((await getGroup('seo')) ?? {});
  const titleSuffix = (seo.success ? seo.data.titleSuffix : '') ?? '';

  return (
    <ArticleEditor
      id={article.id}
      cover={article.cover}
      tab={tab}
      siteUrl={env.SITE_URL}
      titleSuffix={titleSuffix}
      updatedAt={article.updatedAt}
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
  );
}
