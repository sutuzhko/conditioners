/**
 * Проверки доступа для страниц панели.
 *
 * 🔴 Почему проверка стоит и здесь, и в layout (ADR-095): `redirect()` из
 * layout отдаёт браузеру честный 307, но React к этому моменту уже успевает
 * отрисовать страницу параллельно — и её содержимое, вместе с данными,
 * уезжает в теле ответа. Браузер его выбросит, `curl` — нет.
 *
 * Вызов в начале самой страницы решает это прямо: до чтения данных из базы
 * дело не доходит вовсе.
 *
 * 🔴 Чужой роли отвечает `forbidden()`, а не разворот на её рабочий экран
 * (issue #353). Разворот — это 307: код «переехало» у запроса, который никуда
 * не переехал, а был отклонён. Матрица доступа CRM.md §6 проверяется на
 * сервере, и её ответ обязан читаться программой так же, как человеком.
 */
import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';

import { EVERYONE, OWNER } from '@/entities/staff/access';
import type { AdminRole } from '@/entities/staff/model';
import { getAdminSession, type AdminSession } from '@/server/auth';
import { accessAllows, pagePermissionRule, permissionsOf } from '@/server/permissions';
import { ADMIN_PATHNAME_HEADER } from '@/shared/config/admin-headers';

/**
 * Страница, открытая перечисленным ролям. Остальным — 403 (ADR-344).
 *
 * 🔴 Перечень, а не «владелец / любой вошедший». Пока ролей было две, вопрос
 * доступа сводился к «владелец ли это», и проверка была булевой. С четырьмя
 * ролями булев ответ перестаёт существовать: «Заявки» открыты владельцу,
 * администратору и менеджеру и закрыты монтажнику — одним `isOwner` такое не
 * выражается, а вырази́ть его вычитанием («все, кроме монтажника») значило бы
 * открывать каждую новую роль по умолчанию. Перечень закрыт: роль, которую в
 * нём не назвали, не проходит.
 */
export async function requireRolePage(roles: readonly AdminRole[]): Promise<AdminSession> {
  const session = await getAdminSession();
  /* Не вошёл — это не отказ, а «сначала войдите»: 307 на форму входа. */
  if (session === null) redirect('/admin/login');
  if (!(await pageAllows(roles, session))) forbidden();

  return session;
}

/**
 * Перечень ролей, а для администратора — центральная карта разрешений
 * (ADR-344, issue #783).
 *
 * 🔴 Требуемое разрешение страница о себе не объявляет: его называет
 * `server/permissions.ts` по адресу запроса. Иначе строку проверки пришлось бы
 * править в сорока файлах страниц, а забытый аргумент читался бы как
 * «разрешения этому разделу не нужны».
 *
 * 🔴 Адрес приходит заголовком от middleware — своего пути серверный компонент
 * не знает. Заголовка нет (страница вызвана мимо ворот) — администратор не
 * проходит: страж закрыт по умолчанию, и «не смогли определить раздел» не
 * может значить «открыт любой».
 */
async function pageAllows(roles: readonly AdminRole[], session: AdminSession): Promise<boolean> {
  /* Трём остальным ролям заголовок не нужен вовсе: их доступ решает перечень,
     и лишнее чтение заголовков ничего бы не добавило. */
  if (session.role !== 'admin') return roles.includes(session.role);

  const jar = await headers();
  const pathname = jar.get(ADMIN_PATHNAME_HEADER) ?? '';

  return accessAllows({
    role: session.role,
    permissions: permissionsOf(session),
    roles,
    rule: pagePermissionRule(pathname),
  });
}

/**
 * Страница раздела владельца. Всем прочим ролям отвечает отказом — 403.
 *
 * Осталась отдельной функцией, а не заменена вызовом `requireRolePage` по
 * месту: раздел владельца — самый частый случай в панели, и повторять его
 * перечень в шестидесяти файлах значит завести шестьдесят мест, где он может
 * разойтись.
 */
export async function requireOwnerPage(): Promise<AdminSession> {
  return requireRolePage(OWNER);
}

/**
 * Страница, доступная любому вошедшему: свой профиль.
 *
 * 🔴 Внутри — тот же закрытый перечень, а не «сессия есть — проходи». Разница
 * видна только на следующей заведённой роли: проверка «сессия не пуста»
 * открывает ей страницу молча, перечень `EVERYONE` — не открывает, пока роль в
 * него не внесли. Это ровно тот способ, которым `withAdmin` открыл двадцать
 * шесть методов API администратору и менеджеру (ADR-344).
 */
export async function requirePage(): Promise<AdminSession> {
  return requireRolePage(EVERYONE);
}
