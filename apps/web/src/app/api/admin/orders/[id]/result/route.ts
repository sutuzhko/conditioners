/**
 * Итог работ — docs/API.md §13, разбор — docs/CRM.md §3.3.
 *
 * 🔴 Маршрут открыт обеим ролям: итог заполняет и владелец, и монтажник —
 * это его отчёт о выезде. Разграничение остаётся прежним и делает его
 * репозиторий: чужой наряд монтажнику не находится вовсе и отвечает `404`.
 *
 * Плановых полей маршрут не касается: сколько взять с клиента, решает
 * владелец в карточке наряда, а не тот, кто пишет отчёт с объекта.
 */
import { orderResultSchema } from '@/entities/order/model';
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { setResult } from '@/server/repo/orders';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = orderResultSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await setResult(id, parsed.data, { role: session.role, userId: session.userId }));
});
