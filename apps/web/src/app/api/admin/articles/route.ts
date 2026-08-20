/**
 * База знаний в админке — docs/API.md §6.
 */
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { create, listAll } from '@/server/repo/articles';
import { articleInputSchema } from '@/entities/article/model';
import { revalidateArticles } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => json(await listAll()));

export const POST = withAdmin(async (request) => {
  const parsed = articleInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const article = await create(parsed.data);
  revalidateArticles(article.slug);

  return json(article, 201);
});
