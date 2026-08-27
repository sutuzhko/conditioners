import { clientUpdateSchema } from '@/entities/client/model';
import { json, noContent, notFound, readJson, validationError, withOwner } from '@/server/http';
import { listByClient as listUnits } from '@/server/repo/client-units';
import { findById, remove, update } from '@/server/repo/clients';
import { listByClient } from '@/server/repo/leads';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  const client = await findById(id);
  if (client === null) return notFound('Клиент');

  /* Обращения и техника — то, ради чего карточку открывают: что человек
     писал и что у него стоит. Оба списка коротки, читаются одним заходом. */
  const [leads, units] = await Promise.all([listByClient(id), listUnits(id)]);

  return json({ ...client, leads, units });
});

export const PATCH = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = clientUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, parsed.data));
});

/**
 * Удаление карточки — в том числе по требованию субъекта ПДн (152-ФЗ).
 * Обращения при этом остаются: у них своё согласие и свой срок хранения.
 */
export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  await remove(id);
  return noContent();
});
