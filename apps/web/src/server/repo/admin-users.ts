/**
 * Люди, которые заходят в панель: владелец и монтажники (ADR-092).
 *
 * Пароль наружу не отдаётся ни в каком виде — `StaffCard` его не содержит.
 * Из базы `passwordHash` читает только вход.
 */
import type { AdminRole as DbRole, Employment as DbEmployment } from '@prisma/client';

import type { AdminRole, InstallerNoteCard, StaffCard } from '@/entities/staff/model';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { employmentFromDb, employmentToDb } from '@/server/repo/employment';
import type { Employment } from '@/shared/lib/employment';

export type AdminUserRecord = {
  id: string;
  login: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
};

const ROLE_FROM_DB: Record<DbRole, AdminRole> = { OWNER: 'owner', INSTALLER: 'installer' };
const ROLE_TO_DB: Record<AdminRole, DbRole> = { owner: 'OWNER', installer: 'INSTALLER' };

type StaffRow = {
  id: string;
  login: string;
  name: string | null;
  phone: string | null;
  role: DbRole;
  employment: DbEmployment | null;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

const staffSelect = {
  id: true,
  login: true,
  name: true,
  phone: true,
  role: true,
  employment: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

function toCard(row: StaffRow): StaffCard {
  return {
    id: row.id,
    login: row.login,
    name: row.name,
    phone: row.phone,
    role: ROLE_FROM_DB[row.role],
    employment: employmentFromDb(row.employment),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

export async function findByLogin(login: string): Promise<AdminUserRecord | null> {
  const row = await db.adminUser.findUnique({
    where: { login },
    select: { id: true, login: true, passwordHash: true, role: true, active: true },
  });

  if (row === null) return null;

  return { ...row, role: ROLE_FROM_DB[row.role] };
}

/** Только для смены своего пароля: нужно сверить текущий. */
export async function findPasswordHash(id: string): Promise<string | null> {
  const row = await db.adminUser.findUnique({ where: { id }, select: { passwordHash: true } });
  return row?.passwordHash ?? null;
}

/**
 * Записать новый хеш, не трогая сессии.
 *
 * Отличается от `update` намеренно: когда пароль меняет себе сам человек,
 * его текущая сессия обязана остаться — выгонять из панели за то, что он
 * сменил пароль, нельзя. Чужие сессии закрывает вызывающий.
 */
export async function setPasswordHash(id: string, passwordHash: string): Promise<void> {
  await db.adminUser.update({ where: { id }, data: { passwordHash } });
}

export async function markLogin(id: string, at: Date = new Date()): Promise<void> {
  await db.adminUser.update({ where: { id }, data: { lastLoginAt: at } });
}

/** Вся команда: сначала владельцы, дальше монтажники по имени. */
export async function list(): Promise<StaffCard[]> {
  const rows = await db.adminUser.findMany({
    select: staffSelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { login: 'asc' }],
  });

  return rows.map(toCard);
}

export async function listInstallers(onlyActive = false): Promise<StaffCard[]> {
  const rows = await db.adminUser.findMany({
    where: { role: 'INSTALLER', ...(onlyActive ? { active: true } : {}) },
    select: staffSelect,
    orderBy: [{ name: 'asc' }, { login: 'asc' }],
  });

  return rows.map(toCard);
}

export async function countActiveInstallers(): Promise<number> {
  return db.adminUser.count({ where: { role: 'INSTALLER', active: true } });
}

export async function findById(id: string): Promise<StaffCard | null> {
  const row = await db.adminUser.findUnique({ where: { id }, select: staffSelect });
  return row === null ? null : toCard(row);
}

/**
 * Логин занят — это ошибка человека, а не повод подобрать свободный с
 * суффиксом: логин диктуют по телефону, и `petrov-2` вместо `petrov`
 * обнаружился бы только при неудачной попытке войти.
 */
async function assertLoginFree(login: string, exceptId?: string): Promise<void> {
  const taken = await db.adminUser.findUnique({ where: { login }, select: { id: true } });
  if (taken === null || taken.id === exceptId) return;

  throw new ApiException('validation_error', 'Такой логин уже занят', 'login');
}

export async function createInstaller(input: {
  name: string;
  login: string;
  phone: string | null;
  employment: Employment | null;
  passwordHash: string;
}): Promise<StaffCard> {
  await assertLoginFree(input.login);

  const row = await db.adminUser.create({
    data: {
      login: input.login,
      name: input.name,
      phone: input.phone,
      employment: employmentToDb(input.employment),
      passwordHash: input.passwordHash,
      role: ROLE_TO_DB.installer,
    },
    select: staffSelect,
  });

  return toCard(row);
}

export async function update(
  id: string,
  input: {
    name?: string | undefined;
    login?: string | undefined;
    phone?: string | null | undefined;
    employment?: Employment | null | undefined;
    passwordHash?: string | undefined;
    active?: boolean | undefined;
  },
): Promise<StaffCard> {
  const current = await db.adminUser.findUnique({ where: { id }, select: { id: true } });
  if (current === null) throw new ApiException('not_found', 'Сотрудник не найден');

  if (input.login !== undefined) await assertLoginFree(input.login, id);

  const row = await db.adminUser.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.login === undefined ? {} : { login: input.login }),
      ...(input.phone === undefined ? {} : { phone: input.phone }),
      ...(input.employment === undefined ? {} : { employment: employmentToDb(input.employment) }),
      ...(input.passwordHash === undefined ? {} : { passwordHash: input.passwordHash }),
      ...(input.active === undefined ? {} : { active: input.active }),
    },
    select: staffSelect,
  });

  /* Отключение и смена пароля владельцем обязаны выгонять из уже открытых
     сессий: `readSession` это тоже проверяет, но лишняя строка в базе с
     рабочим токеном — не то, что стоит оставлять. */
  if (input.active === false || input.passwordHash !== undefined) {
    await db.session.deleteMany({ where: { userId: id } });
  }

  return toCard(row);
}

/**
 * Удаление учётной записи. Владельца удалить нельзя: панель без владельца
 * закрывается насовсем, и восстановить доступ можно будет только из консоли.
 */
export async function remove(id: string): Promise<void> {
  const row = await db.adminUser.findUnique({ where: { id }, select: { role: true } });
  if (row === null) throw new ApiException('not_found', 'Сотрудник не найден');

  if (row.role === 'OWNER') {
    throw new ApiException('forbidden', 'Учётную запись владельца удалить нельзя');
  }

  await db.adminUser.delete({ where: { id } });
}

// ---------- Заметки владельца о монтажнике ----------

export async function listNotes(userId: string): Promise<InstallerNoteCard[]> {
  const rows = await db.installerNote.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, createdAt: true },
  });

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addNote(userId: string, text: string): Promise<InstallerNoteCard> {
  const exists = await db.adminUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Сотрудник не найден');

  const row = await db.installerNote.create({
    data: { userId, text },
    select: { id: true, text: true, createdAt: true },
  });

  return { id: row.id, text: row.text, createdAt: row.createdAt.toISOString() };
}

export async function removeNote(id: string): Promise<void> {
  const removed = await db.installerNote.deleteMany({ where: { id } });
  if (removed.count === 0) throw new ApiException('not_found', 'Заметка не найдена');
}
