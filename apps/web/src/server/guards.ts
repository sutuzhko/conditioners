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
import { forbidden, redirect } from 'next/navigation';

import { getAdminSession, isOwner, type AdminSession } from '@/server/auth';

/** Страница раздела владельца. Монтажнику отвечает отказом — 403. */
export async function requireOwnerPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  /* Не вошёл — это не отказ, а «сначала войдите»: 307 на форму входа. */
  if (session === null) redirect('/admin/login');
  if (!isOwner(session)) forbidden();

  return session;
}

/** Страница, доступная любому вошедшему: календарь, профиль. */
export async function requirePage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  return session;
}
