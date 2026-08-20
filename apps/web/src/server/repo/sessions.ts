/**
 * Хранилище сессий админки. В базе лежит только хеш токена: утечка дампа не
 * должна давать возможность войти (docs/TECH_DECISIONS §8).
 */
import { db } from '@/server/db';

export type StoredSession = {
  id: string;
  userId: string;
  login: string;
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
      user: { select: { login: true } },
    },
  });

  if (row === null) return null;

  return { id: row.id, userId: row.userId, login: row.user.login, expiresAt: row.expiresAt };
}

export async function deleteByTokenHash(tokenHash: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash } });
}

export async function deleteExpired(now: Date = new Date()): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
}
