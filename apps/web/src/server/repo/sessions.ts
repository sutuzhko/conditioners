/**
 * Хранилище сессий админки. В базе лежит только хеш токена: утечка дампа не
 * должна давать возможность войти (docs/TECH_DECISIONS §8).
 */
import type { AdminRole as DbRole } from '@prisma/client';

import type { AdminRole } from '@/entities/staff/model';
import { db } from '@/server/db';

const ROLE_FROM_DB: Record<DbRole, AdminRole> = { OWNER: 'owner', INSTALLER: 'installer' };

export type StoredSession = {
  id: string;
  userId: string;
  login: string;
  name: string | null;
  role: AdminRole;
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
      user: { select: { login: true, name: true, role: true, active: true } },
    },
  });

  if (row === null) return null;

  return {
    id: row.id,
    userId: row.userId,
    login: row.user.login,
    name: row.user.name,
    role: ROLE_FROM_DB[row.user.role],
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
