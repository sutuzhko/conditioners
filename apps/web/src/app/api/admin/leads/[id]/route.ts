import { json, notFound, readJson, validationError, withAdmin } from '@/server/http';
import { findById, update } from '@/server/repo/leads';
import { leadUpdateSchema } from '@/entities/lead/model';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withAdmin(async (_request, context: Context) => {
  const { id } = await context.params;
  const lead = await findById(id);
  return lead === null ? notFound('Заявка') : json(lead);
});

/**
 * Меняются только статус и комментарий менеджера.
 * Данные клиента — то, что он прислал; правка их превращает заявку в пересказ.
 * Ревалидации нет: заявки на публичных страницах не показываются.
 */
export const PATCH = withAdmin(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = leadUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, parsed.data));
});
