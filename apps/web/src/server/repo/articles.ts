/**
 * База знаний. Публичное чтение — только опубликованные статьи.
 */
import { db } from '@/server/db';
import { withSlugRetry } from '@/server/repo/slug-retry';
import { ApiException } from '@/server/http';
import { pageSlug, uniqueSlug } from '@/shared/lib/slug';
import type { ArticleInput, ArticlePatch } from '@/entities/article/model';

export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  minutes: number;
  cover: string | null;
  excerpt: string;
  published: boolean;
  updatedAt: string;
};

export type ArticleDto = ArticleListItem & {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const listSelect = {
  id: true,
  slug: true,
  title: true,
  category: true,
  date: true,
  minutes: true,
  cover: true,
  excerpt: true,
  published: true,
  updatedAt: true,
} as const;

type ListRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: Date;
  minutes: number;
  cover: string | null;
  excerpt: string;
  published: boolean;
  updatedAt: Date;
};

function toListItem(row: ListRow): ArticleListItem {
  return { ...row, date: row.date.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function toDto(
  row: ListRow & { body: string; seoTitle: string | null; seoDescription: string | null },
): ArticleDto {
  return {
    ...toListItem(row),
    body: row.body,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** Список без `body`: он не нужен ни листингу, ни тизеру, а весит больше всего. */
export async function listPublished(): Promise<ArticleListItem[]> {
  const rows = await db.article.findMany({
    where: { published: true },
    select: listSelect,
    orderBy: { date: 'desc' },
  });
  return rows.map(toListItem);
}

export async function findPublishedBySlug(slug: string): Promise<ArticleDto | null> {
  const row = await db.article.findFirst({ where: { slug, published: true } });
  return row === null ? null : toDto(row);
}

export async function listAll(): Promise<ArticleListItem[]> {
  const rows = await db.article.findMany({ select: listSelect, orderBy: { date: 'desc' } });
  return rows.map(toListItem);
}

export async function findById(id: string): Promise<ArticleDto | null> {
  const row = await db.article.findUnique({ where: { id } });
  return row === null ? null : toDto(row);
}

/**
 * Свободный адрес: занятые соседи берутся одним запросом по префиксу, а
 * суффикс подбирает чистая функция из `shared/lib/slug` — та же, что и на
 * клиенте, чтобы предпросмотр адреса в админке совпадал с тем, что сохранится.
 */
async function freeSlug(source: string, exceptId?: string): Promise<string> {
  const base = pageSlug(source);
  const rows = await db.article.findMany({
    where: { slug: { startsWith: base } },
    select: { id: true, slug: true },
  });

  return uniqueSlug(
    base,
    rows.filter((row) => row.id !== exceptId).map((row) => row.slug),
  );
}

export function create(input: ArticleInput): Promise<ArticleDto> {
  // повтор закрывает гонку подбора адреса — см. withSlugRetry
  return withSlugRetry(() => createOnce(input));
}

async function createOnce(input: ArticleInput): Promise<ArticleDto> {
  const slug = await freeSlug(input.slug ?? input.title);

  const row = await db.article.create({
    data: {
      slug,
      title: input.title,
      category: input.category,
      date: input.date,
      minutes: input.minutes,
      excerpt: input.excerpt,
      body: input.body,
      published: input.published ?? false,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
    },
  });

  return toDto(row);
}

export function update(id: string, input: ArticlePatch): Promise<ArticleDto> {
  return withSlugRetry(() => updateOnce(id, input));
}

async function updateOnce(id: string, input: ArticlePatch): Promise<ArticleDto> {
  const current = await db.article.findUnique({ where: { id }, select: { slug: true } });
  if (current === null) throw new ApiException('not_found', 'Статья не найдена');

  const slug =
    input.slug === undefined || input.slug === current.slug
      ? current.slug
      : await freeSlug(input.slug, id);

  const row = await db.article.update({
    where: { id },
    // Не переданные поля не затираются: PATCH правит часть статьи.
    data: {
      slug,
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.date === undefined ? {} : { date: input.date }),
      ...(input.minutes === undefined ? {} : { minutes: input.minutes }),
      ...(input.excerpt === undefined ? {} : { excerpt: input.excerpt }),
      ...(input.body === undefined ? {} : { body: input.body }),
      ...(input.published === undefined ? {} : { published: input.published }),
      ...(input.seoTitle === undefined ? {} : { seoTitle: input.seoTitle }),
      ...(input.seoDescription === undefined ? {} : { seoDescription: input.seoDescription }),
    },
  });

  return toDto(row);
}

/** `null` снимает обложку: ручка одна, потому что и запись в базе одна. */
export async function setCover(id: string, cover: string | null): Promise<ArticleDto> {
  const exists = await db.article.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Статья не найдена');

  const row = await db.article.update({ where: { id }, data: { cover } });
  return toDto(row);
}

export async function remove(id: string): Promise<{ slug: string }> {
  const row = await db.article.findUnique({ where: { id }, select: { slug: true } });
  if (row === null) throw new ApiException('not_found', 'Статья не найдена');
  await db.article.delete({ where: { id } });
  return row;
}
