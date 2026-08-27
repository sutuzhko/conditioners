/**
 * Расход наряда — docs/API.md §14.
 *
 * Чеклист выезда знает, что нужно; склад отвечает, есть ли; закрытие наряда
 * списывает израсходованное по факту (CRM.md §11.6).
 *
 * 🔴 Монтажник списывает только по своему наряду и только из своей машины.
 * Чужой наряд отвечает `404` — существование чужого наряда его не касается
 * (ADR-114); чужая машина — `403`. Обе проверки в репозитории, вместе с
 * доступом к данным.
 */
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { orderConsumeSchema } from '@/entities/stock/model';
import { consume, consumptionOf } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withAdmin(async (_request, context: Context, session) => {
  const { id } = await context.params;

  return json(await consumptionOf(id, { role: session.role, userId: session.userId }));
});

export const POST = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = orderConsumeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  /* Возвращается весь расход наряда, а не только что записанное: форма
     закрытия показывает списанное списком, и собирать его из двух ответов
     значит однажды показать половину. */
  return json(await consume(id, parsed.data, { role: session.role, userId: session.userId }), 201);
});
