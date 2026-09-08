/**
 * Хранилище сессий админки. В базе лежит только хеш токена: утечка дампа не
 * должна давать возможность войти (docs/TECH_DECISIONS §8).
 */
import type { AdminRole } from '@/entities/staff/model';
import type { AdminPermission } from '@/entities/staff/permissions';
import { db } from '@/server/db';
import { permissionsFromDb, roleFromDb } from '@/server/repo/roles';

export type StoredSession = {
  id: string;
  userId: string;
  login: string;
  name: string | null;
  role: AdminRole;
  /**
   * Что владелец открыл этому администратору (ADR-344).
   *
   * 🔴 Едет вместе с сессией, а не читается отдельным запросом, и читается на
   * **каждый** запрос: снятый переключатель обязан закрыть раздел сразу, а не
   * после следующего входа (issue #782). Кеша здесь нет и быть не может —
   * иначе «снял права» означало бы «снял, когда протухнет».
   */
  permissions: readonly AdminPermission[];
  /** Отключённый доступ обязан закрывать уже открытую сессию, а не только вход. */
  active: boolean;
  expiresAt: Date;
};

export async function create(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<{ id: string }> {
  return db.session.create({
    data: { userId, tokenHash, expiresAt },
    select: { id: true },
  });
}

export async function findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
  const row = await db.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: { select: { login: true, name: true, role: true, permissions: true, active: true } },
    },
  });

  if (row === null) return null;

  return {
    id: row.id,
    userId: row.userId,
    login: row.user.login,
    name: row.user.name,
    role: roleFromDb(row.user.role),
    permissions: permissionsFromDb(row.user.permissions),
    active: row.user.active,
    expiresAt: row.expiresAt,
  };
}

export async function deleteByTokenHash(tokenHash: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash } });
}

/**
 * Закрыть все сессии человека, кроме текущей. Нужно при смене пароля и при
 * отключении доступа: cookie, оставшийся в чужом браузере, обязан перестать
 * работать сразу.
 */
export async function deleteOtherForUser(userId: string, keepTokenHash: string): Promise<void> {
  await db.session.deleteMany({ where: { userId, NOT: { tokenHash: keepTokenHash } } });
}

export async function deleteExpired(now: Date = new Date()): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
}
