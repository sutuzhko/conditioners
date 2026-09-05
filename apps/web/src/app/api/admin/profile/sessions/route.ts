/**
 * Выход на всех устройствах — docs/API.md §11.
 *
 * 🔴 Не то же самое, что `/api/auth/logout`: тот закрывает сессию этого
 * браузера, а этот — все остальные. Нужен он ровно тогда, когда владелец
 * вспомнил про открытую панель на чужом компьютере или про потерянный
 * телефон, и звонить разработчику ради этого он не должен.
 *
 * Пароль не спрашивается: до маршрута доходит только тот, у кого уже есть
 * рабочая сессия, а действие ничего не разрушает — оно лишь просит войти
 * заново. Смена пароля рядом делает то же самое своим следствием.
 */
import { SESSION_COOKIE, logoutOtherSessions } from '@/server/auth';
import { noContent, withAdmin } from '@/server/http';

export const dynamic = 'force-dynamic';

export const DELETE = withAdmin(async (request, _context, session) => {
  await logoutOtherSessions(session.userId, request.cookies.get(SESSION_COOKIE)?.value);

  return noContent();
});
