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
 */
import { redirect } from 'next/navigation';

import { getAdminSession, isOwner, type AdminSession } from '@/server/auth';

/** Страница раздела владельца. Монтажника уводит на его рабочий экран. */
export async function requireOwnerPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');
  if (!isOwner(session)) redirect('/admin/crm');

  return session;
}

/** Страница, доступная любому вошедшему: календарь, профиль. */
export async function requirePage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return session;
}
