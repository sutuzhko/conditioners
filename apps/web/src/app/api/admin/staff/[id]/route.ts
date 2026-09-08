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

  /* 🔴 Себе пароль меняют в профиле, и там спрашивают текущий. Здесь текущий
     не спрашивается — раздел заведён под правку чужих учётных записей, где
     старого пароля никто и не знает. Для своей это значит, что дошедший до
     открытой панели ставит себе пароль, не зная прежнего: сессия, забытая на
     чужом компьютере, превращается в постоянный доступ, а все остальные
     сессии человека тем же запросом гасятся. */
  if (id === session.userId && parsed.data.password !== undefined) {
    return apiError('forbidden', 'Себе пароль меняют в профиле — там спрашивают текущий');
  }

  const { password, ...rest } = parsed.data;

  /* 🔴 Кто правит — из сессии, и дальше это решает репозиторий. Раздел открыт
     не только владельцу: администратору его выдаёт переключатель «Сотрудники»
     вместе с «Управлением людьми» (ADR-344), и учётная запись владельца или
     равного администратора этой ручкой ему не правится. */
  return json(
    await update(
      id,
      {
        ...rest,
        ...(password === undefined ? {} : { passwordHash: await hashPassword(password) }),
      },
      { userId: session.userId, role: session.role },
    ),
  );
});

export const DELETE = withOwner(async (_request, context: Context, session) => {
  const { id } = await context.params;

  if (id === session.userId) return apiError('forbidden', 'Себя удалить нельзя');

  await remove(id, { userId: session.userId, role: session.role });
  return noContent();
});
