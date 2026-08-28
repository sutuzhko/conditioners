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
import { findDetails, listNotes, remove, update } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  /* Раздел владельца: карточка приходит вместе с ИНН — он нужен, чтобы
     проверять статус самозанятого на дату выплаты (PROJECT §5.4). Своему
     профилю его отдаёт не этот маршрут и не отдаёт вовсе. */
  const staff = await findDetails(id);
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

  /* 🔴 Оформление — условие расчётов по нарядам, а не личная настройка: от
     него зависит, чем является удержание (CRM.md §9). Себе его не меняют —
     это тот же класс, что логин и роль в профиле. */
  if (id === session.userId && parsed.data.employment !== undefined) {
    return apiError('forbidden', 'Себе оформление не меняют');
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
