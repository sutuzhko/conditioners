/**
 * Свой профиль — доступен обеим ролям.
 *
 * Логин и роль здесь не меняются: логин напечатан на бумажке, которую человеку
 * выдал владелец, а роль — это доступ к деньгам компании.
 */
import { profileUpdateSchema } from '@/entities/staff/model';
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { findById, update } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_request, _context, session) => {
  const me = await findById(session.userId);
  return json(me);
});

export const PATCH = withAdmin(async (request, _context, session) => {
  const parsed = profileUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(session.userId, parsed.data));
});
