/**
 * База знаний. Публичное чтение — только опубликованные статьи.
 */
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { withSlugRetry } from '@/server/repo/slug-retry';
import { ApiException } from '@/server/http';
import { pageSlug, uniqueSlug } from '@/shared/lib/slug';
import { pageWindow, type Page } from '@/shared/lib/paging';
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

/**
 * Строка списка в панели: то же, что и в листинге, плюс длина текста.
 *
 * 🔴 Число знаков — не украшение подписи. Статья на две тысячи знаков не
 * ранжируется, и владельцу нужно видеть это в списке, а не открывая каждую
 * (issue #614).
 */
export type ArticleAdminRow = ArticleListItem & { readonly chars: number };

/** Состояние статьи как фильтр списка: опубликованные или черновики. */
export type ArticleState = 'published' | 'draft';

/** Порядок списка: сначала новые (умолчание) или сначала старые. */
export type ArticleOrder = 'new' | 'old';

export type ArticleQuery = {
  readonly query?: string | undefined;
  readonly category?: string | undefined;
  readonly state?: ArticleState | undefined;
  readonly order?: ArticleOrder | undefined;
  readonly page?: number | undefined;
};

/** Счётчики шапки раздела: они про всю базу знаний, а не про страницу списка. */
export type ArticleCounts = {
  readonly total: number;
  readonly published: number;
  readonly drafts: number;
};

/**
 * Поиск по заголовку, тексту и тизеру.
 *
 * Текст статьи входит в поиск намеренно: заголовок владелец помнит редко, а
 * фразу из абзаца — почти всегда. Адрес тоже ищется: по нему статью находят,
 * когда пришла жалоба на ссылку.
 */
function articleSearchWhere(query: string): Prisma.ArticleWhereInput {
  const text = query.trim();
  if (text === '') return {};

  return {
    OR: [
      { title: { contains: text, mode: 'insensitive' } },
      { excerpt: { contains: text, mode: 'insensitive' } },
      { body: { contains: text, mode: 'insensitive' } },
      { slug: { contains: text, mode: 'insensitive' } },
    ],
  };
}

function articleWhere(params: ArticleQuery): Prisma.ArticleWhereInput {
  const category = params.category?.trim() ?? '';

  return {
    ...articleSearchWhere(params.query ?? ''),
    ...(category === '' ? {} : { category }),
    ...(params.state === undefined ? {} : { published: params.state === 'published' }),
  };
}

/**
 * Страница списка статей для панели.
 *
 * 🔴 Текст читается вместе со строкой — ровно ради длины (`chars`), и наружу
 * не отдаётся. Восемь тел статей на страницу читаются дешевле, чем второй
 * запрос на каждую строку; список без окна такого себе позволить не мог бы, и
 * именно поэтому окно здесь появилось раньше подписи (issue #612, #614).
 */
export async function listAdmin(params: ArticleQuery = {}): Promise<Page<ArticleAdminRow>> {
  const where = articleWhere(params);
  const total = await db.article.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.article.findMany({
    where,
    select: { ...listSelect, body: true },
    orderBy: { date: params.order === 'old' ? 'asc' : 'desc' },
    skip,
    take,
  });

  return {
    items: rows.map(({ body, ...row }) => ({ ...toListItem(row), chars: body.length })),
    total,
    page,
    pages,
  };
}

/** Счётчики шапки: сколько всего, сколько на сайте, сколько ещё черновики. */
export async function adminCounts(): Promise<ArticleCounts> {
  const [total, published] = await Promise.all([
    db.article.count(),
    db.article.count({ where: { published: true } }),
  ]);

  return { total, published, drafts: total - published };
}

/**
 * Рубрики, которые владелец уже завёл.
 *
 * 🔴 Из базы, а не из списка в коде (инвариант 8): рубрику заводит владелец,
 * вписывая её в форме статьи, и зашитый перечень устарел бы в тот же день.
 * Отсюда же берётся выбор в фильтре — предлагать несуществующую рубрику
 * бессмысленно.
 */
export async function categories(): Promise<readonly string[]> {
  const rows = await db.article.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });

  return rows.map((row) => row.category).filter((category) => category.trim() !== '');
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
