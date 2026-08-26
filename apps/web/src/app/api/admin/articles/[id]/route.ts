import { json, noContent, notFound, readJson, validationError, withAdmin } from '@/server/http';
import { findById, remove, update } from '@/server/repo/articles';
import { articleInputSchema, articlePatchSchema } from '@/entities/article/model';
import { deleteStoredImage } from '@/server/uploads/store';
import { revalidateArticles } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withAdmin(async (_request, context: Context) => {
  const { id } = await context.params;
  const article = await findById(id);
  return article === null ? notFound('Статья', 'f') : json(article);
});

export const PUT = withAdmin(async (request, context: Context) => {
  const { id } = await context.params;
  const parsed = articleInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const before = await findById(id);
  if (before === null) return notFound('Статья', 'f');

  const article = await update(id, parsed.data);
  revalidateArticles(article.slug);
  if (before.slug !== article.slug) revalidateArticles(before.slug);

  return json(article);
});

export const PATCH = withAdmin(async (request, context: Context) => {
  const { id } = await context.params;
  const parsed = articlePatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const before = await findById(id);
  if (before === null) return notFound('Статья', 'f');

  const article = await update(id, parsed.data);
  revalidateArticles(article.slug);
  if (before.slug !== article.slug) revalidateArticles(before.slug);

  return json(article);
});

export const DELETE = withAdmin(async (_request, context: Context) => {
  const { id } = await context.params;

  const article = await findById(id);
  if (article === null) return notFound('Статья', 'f');

  await remove(id);
  if (article.cover !== null) await deleteStoredImage(article.cover);

  revalidateArticles(article.slug);

  return noContent();
});
