import { staffUpdateSchema } from '@/entities/staff/model';
import { hashPassword } from '@/server/auth';
import {
  apiError,
  json,
  noContent,
  notFound,
  readJson,
  validationError,
  withOwner,
} from '@/server/http';
import { findById, listNotes, remove, update } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  const staff = await findById(id);
  if (staff === null) return notFound('Сотрудник');

  return json({ ...staff, notes: await listNotes(id) });
});

export const PATCH = withOwner(async (request, context: Context, session) => {
  const { id } = await context.params;

  const parsed = staffUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  /* Отключить себе доступ — это запереть панель снаружи: вход закроется тем
     же запросом, а включить обратно будет некому. */
  if (id === session.userId && parsed.data.active === false) {
    return apiError('forbidden', 'Себе доступ не отключают');
  }

  const { password, ...rest } = parsed.data;

  return json(
    await update(id, {
      ...rest,
      ...(password === undefined ? {} : { passwordHash: await hashPassword(password) }),
    }),
  );
});

export const DELETE = withOwner(async (_request, context: Context, session) => {
  const { id } = await context.params;

  if (id === session.userId) return apiError('forbidden', 'Себя удалить нельзя');

  await remove(id);
  return noContent();
});
