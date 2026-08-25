/**
 * Команда — docs/API.md §11.
 *
 * Раздел владельца целиком: монтажник не должен видеть ни списка коллег, ни
 * их телефонов. Проверка роли — в `withOwner`, а не в разметке (ADR-092).
 */
import { staffCreateSchema } from '@/entities/staff/model';
import { hashPassword } from '@/server/auth';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { createInstaller, list } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

export const GET = withOwner(async () => json(await list()));

export const POST = withOwner(async (request) => {
  const parsed = staffCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const created = await createInstaller({
    name: parsed.data.name,
    login: parsed.data.login,
    phone: parsed.data.phone,
    passwordHash: await hashPassword(parsed.data.password),
  });

  return json(created, 201);
});
