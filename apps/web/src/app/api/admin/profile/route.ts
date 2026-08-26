/**
 * Свой профиль — доступен обеим ролям.
 *
 * Логин, роль и оформление здесь не меняются: логин напечатан на бумажке,
 * которую человеку выдал владелец, роль — это доступ к деньгам компании, а
 * оформление — условие расчётов по нарядам (CRM.md §9). Оформление в ответе
 * есть: человек видит, как он оформлен, но правит его владелец.
 */
import { profileUpdateSchema } from '@/entities/staff/model';
import { apiError, json, readJson, validationError, withAdmin } from '@/server/http';
import { findById, update } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_request, _context, session) => {
  const me = await findById(session.userId);
  return json(me);
});

export const PATCH = withAdmin(async (request, _context, session) => {
  const body = await readJson(request);

  /* 🔴 Схема профиля оформления не знает и отвергла бы его как лишний ключ,
     но отказ должен объяснять, куда идти: сменить оформление себе нельзя ни
     монтажнику, ни владельцу — это делает владелец в разделе команды. */
  if (mentionsEmployment(body)) {
    return apiError('forbidden', 'Оформление меняет владелец в разделе «Монтажники»');
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(session.userId, parsed.data));
});

function mentionsEmployment(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'employment' in body;
}
