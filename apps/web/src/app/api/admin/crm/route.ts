import { crmEventCreateSchema } from '@/entities/crm/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { create } from '@/server/repo/crm';

export const dynamic = 'force-dynamic';

/**
 * Новое дело в календаре.
 *
 * Ревалидации нет и не будет: календарь работ нигде на сайте не показывается —
 * это внутренний график с телефонами и адресами клиентов.
 */
export const POST = withOwner(async (request) => {
  const parsed = crmEventCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await create(parsed.data), 201);
});
