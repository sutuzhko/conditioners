/**
 * Чистка журнала за период — docs/API.md §18.
 *
 * 🔴 Отдельный адрес, а не `DELETE` над списком. `DELETE /activity` читается
 * как «удалить журнал» и отличается от чистки за год одним забытым параметром;
 * названное действие требует назвать период целиком, и обе его даты обязательны
 * (ADR-345, issue #821). Построчного удаления в API нет ни здесь, ни у записи.
 *
 * Порядок записей обработчику не принадлежит (ADR-142): удаление и след
 * чистки неразделимы, и держит их транзакция в сервисе.
 */
import { activityCleanupSchema } from '@/entities/activity/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { cleanupActivity } from '@/server/services/activity';

export const dynamic = 'force-dynamic';

export const POST = withOwner(async (request, _context, session) => {
  const parsed = activityCleanupSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await cleanupActivity({ period: parsed.data, actorId: session.userId }));
});
