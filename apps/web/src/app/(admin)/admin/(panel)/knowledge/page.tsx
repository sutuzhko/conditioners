import type { Metadata } from 'next';
import Link from 'next/link';

import { KNOWLEDGE_NEW_PATH } from '@/features/article-form';
import { requireOwnerPage } from '@/server/guards';
import { adminCounts, categories, listAdmin } from '@/server/repo/articles';
import { pageNumber } from '@/shared/lib/paging';
import { Pager, Skeleton, buttonClassName } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';
import {
  AdminArticleList,
  ArticleSearch,
  KNOWLEDGE_PATH,
  adminKnowledgeContent as texts,
  articleFilterOf,
  articleFilterOn,
  articleFilterQuery,
  type ArticleFilter,
  type ArticleSearchParams,
} from '@/widgets/admin-knowledge';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * База знаний: список статей, отбор и вход в правку.
 *
 * 🔴 Отбор и страница живут в адресе, а не в состоянии на клиенте (ADR-105,
 * issue #612, #614): найденное можно оставить в закладках, а «назад» браузера
 * возвращает к прошлому списку. Разбивка — ссылками: сама она не стоит панели
 * ни байта бюджета JS.
 *
 * 🔴 Список — асинхронный блок (issue #334, #336): шапка и фильтры уезжают в
 * браузер сразу, таблица приезжает отдельным куском потока на место
 * заготовки, а упавший запрос показывает ошибку на её месте, оставляя
 * навигацию рабочей.
 */
export default async function AdminKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<ArticleSearchParams>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const params = await searchParams;
  const filter = articleFilterOf(params);

  /* 🔴 Счётчики и рубрики принадлежат шапке и фильтрам, а не списку: приехав
     позже, они сдвинули бы таблицу вниз уже после того, как на неё
     посмотрели. Отказ базы гасится здесь — об этом скажет блок списка, у
     которого есть и объяснение, и повтор. */
  const [counts, known] = await Promise.all([countsOrNull(), categoriesOrEmpty()]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          <p className={styles.summary}>
            {counts === null
              ? texts.summaryUnknown
              : texts.summary(counts.total, counts.published, counts.drafts)}
          </p>
        </div>

        <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: KNOWLEDGE_NEW_PATH }}>
          {texts.add}
        </Link>
      </header>

      <ArticleSearch filter={filter} categories={known} />

      <DataBlock
        skeleton={<Skeleton variant="block" className={styles.tableSkeleton} />}
        title={texts.loadFailed}
        note={blockErrorNote(KNOWLEDGE_PATH)}
      >
        <ArticlesBlock filter={filter} page={pageNumber(params.page)} />
      </DataBlock>
    </div>
  );
}

/**
 * Таблица статей и разбивка — то, что приезжает отдельным куском потока.
 *
 * Обёртка `data-block` — единственный узел блока, не зависящий от данных: по
 * нему сквозные сценарии находят кусок потока и меряют его положение.
 */
async function ArticlesBlock({
  filter,
  page,
}: {
  readonly filter: ArticleFilter;
  readonly page: number;
}) {
  const found = await listAdmin({
    ...(filter.query === '' ? {} : { query: filter.query }),
    ...(filter.category === '' ? {} : { category: filter.category }),
    ...(filter.state === undefined ? {} : { state: filter.state }),
    ...(filter.order === undefined ? {} : { order: filter.order }),
    page,
  });

  return (
    <div className={styles.block} data-block="articles">
      <AdminArticleList
        articles={found.items.map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          category: article.category,
          date: article.date,
          minutes: article.minutes,
          published: article.published,
          chars: article.chars,
          cover: article.cover,
        }))}
        filtered={articleFilterOn(filter)}
      />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath={KNOWLEDGE_PATH}
        query={articleFilterQuery(filter)}
        label={texts.pagerLabel}
        numbers
      />
    </div>
  );
}

/**
 * Счётчики раздела или `null`, если база не ответила.
 *
 * Отказ гасится здесь, а не поднимается выше: ошибка раздела одна, и она
 * принадлежит списку — там есть и объяснение, и повтор. Строка без чисел при
 * этом сохраняет высоту, и раскладка не прыгает.
 */
async function countsOrNull(): Promise<Awaited<ReturnType<typeof adminCounts>> | null> {
  try {
    return await adminCounts();
  } catch {
    return null;
  }
}

/** Рубрики для фильтра; база не ответила — выпадающего списка просто нет. */
async function categoriesOrEmpty(): Promise<readonly string[]> {
  try {
    return await categories();
  } catch {
    return [];
  }
}
