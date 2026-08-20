import { db } from '@/server/db';

export type AdminUserRecord = {
  id: string;
  login: string;
  passwordHash: string;
};

export async function findByLogin(login: string): Promise<AdminUserRecord | null> {
  return db.adminUser.findUnique({
    where: { login },
    select: { id: true, login: true, passwordHash: true },
  });
}

export async function markLogin(id: string, at: Date = new Date()): Promise<void> {
  await db.adminUser.update({ where: { id }, data: { lastLoginAt: at } });
}
