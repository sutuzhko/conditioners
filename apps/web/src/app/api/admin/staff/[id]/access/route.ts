import { staffAccessSchema } from '@/entities/staff/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { setAccess } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * Роль и разрешения человека — контракт docs/API.md §11 (ADR-344, issue #784).
 *
 * 🔴 Отдельная ручка, а не поле в `PATCH /staff/{id}`. Карточку сотрудника
 * правит и тот администратор, которому владелец выдал «Управление людьми», —
 * имя, телефон, оформление. Раздачу прав ему не открывает ни один
 * переключатель (ADR-344), и держать её в общем теле значило бы разбирать
 * права по полям внутри обработчика вместо того, чтобы закрыть адрес целиком:
 * `staff/*​/access PATCH` стоит в центральной карте как владельческий.
 *
 * Владельца эта ручка не правит вовсе — отказывает репозиторий: понизить
 * единственного владельца значит запереть панель снаружи.
 */
export const PATCH = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = staffAccessSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await setAccess(id, parsed.data));
});
