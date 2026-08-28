/**
 * Люди, которые заходят в панель: владелец и монтажники (ADR-092).
 *
 * Пароль наружу не отдаётся ни в каком виде — `StaffCard` его не содержит.
 * Из базы `passwordHash` читает только вход.
 */
import type { AdminRole as DbRole, Employment as DbEmployment, Prisma } from '@prisma/client';

import type { AdminRole, InstallerNoteCard, StaffCard, StaffDetails } from '@/entities/staff/model';
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
  inn: string | null;
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
  inn: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

/**
 * Карточка без ИНН — то, что о человеке видно любому экрану панели.
 *
 * 🔴 Проекция под роль идёт здесь, а не в разметке (ADR-114). ИНН —
 * персональные данные работника (PROJECT §5.5), и нужен он только владельцу в
 * разделе «Монтажники»; календарь, назначение наряда и свой профиль читают
 * эту функцию и физически не могут его показать.
 */
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

/** Та же карточка с ИНН — только для экранов владельца. */
function toDetails(row: StaffRow): StaffDetails {
  return { ...toCard(row), inn: row.inn };
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

/**
 * Вся команда: сначала владельцы, дальше монтажники по имени.
 *
 * Отдаёт карточки с ИНН: список читают только экраны владельца — раздел
 * «Монтажники», зоны склада и `GET /api/admin/staff` под `withOwner`. Список
 * должен показать, у кого из самозанятых ИНН не заведён, не заходя в карточку
 * каждого.
 */
export async function list(): Promise<StaffDetails[]> {
  const rows = await db.adminUser.findMany({
    select: staffSelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { login: 'asc' }],
  });

  return rows.map(toDetails);
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

/**
 * Карточка для любого экрана панели, включая свой профиль: ИНН в ней нет.
 *
 * 🔴 Профиль доступен обеим ролям, и лишний реквизит в его ответе — лишняя
 * дорога к персональным данным. Владельцу, которому ИНН нужен, отвечает
 * `findDetails`.
 */
export async function findById(id: string): Promise<StaffCard | null> {
  const row = await db.adminUser.findUnique({ where: { id }, select: staffSelect });
  return row === null ? null : toCard(row);
}

/** Карточка с ИНН — раздел «Монтажники», закрытый `withOwner` и `requireOwnerPage`. */
export async function findDetails(id: string): Promise<StaffDetails | null> {
  const row = await db.adminUser.findUnique({ where: { id }, select: staffSelect });
  return row === null ? null : toDetails(row);
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
  inn: string | null;
  passwordHash: string;
}): Promise<StaffCard> {
  await assertLoginFree(input.login);

  const row = await db.adminUser.create({
    data: {
      login: input.login,
      name: input.name,
      phone: input.phone,
      employment: employmentToDb(input.employment),
      inn: input.inn,
      passwordHash: input.passwordHash,
      role: ROLE_TO_DB.installer,
    },
    select: staffSelect,
  });

  return toCard(row);
}

/**
 * Правка учётной записи.
 *
 * Отвечает карточкой без ИНН: ту же функцию зовёт свой профиль, доступный
 * обеим ролям. Владелец видит сохранённый ИНН чтением карточки — форма после
 * успеха и так перечитывает страницу.
 */
export async function update(
  id: string,
  input: {
    name?: string | undefined;
    login?: string | undefined;
    phone?: string | null | undefined;
    employment?: Employment | null | undefined;
    inn?: string | null | undefined;
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
      ...(input.inn === undefined ? {} : { inn: input.inn }),
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

// ---------- Адреса доставки уведомлений ----------
// До адресации адрес был один на компанию, и разослать «каждому своё» было
// физически некуда. Здесь читаются и пишутся только два поля учётной записи —
// чат телеграма и почта; всё остальное про человека правит раздел «Команда».

export type DeliveryTarget = {
  readonly id: string;
  /** Имя или логин: в журнале доставки должно быть видно, кому ушло. */
  readonly name: string;
  readonly login: string;
  readonly role: AdminRole;
  readonly active: boolean;
  readonly telegramChatId: string | null;
  readonly email: string | null;
};

const deliverySelect = {
  id: true,
  login: true,
  name: true,
  role: true,
  active: true,
  telegramChatId: true,
  email: true,
} as const;

type DeliveryRow = {
  id: string;
  login: string;
  name: string | null;
  role: DbRole;
  active: boolean;
  telegramChatId: string | null;
  email: string | null;
};

function toDeliveryTarget(row: DeliveryRow): DeliveryTarget {
  return {
    id: row.id,
    name: row.name ?? row.login,
    login: row.login,
    role: ROLE_FROM_DB[row.role],
    active: row.active,
    telegramChatId: row.telegramChatId,
    email: row.email,
  };
}

/**
 * Адреса одного получателя. Принимает транзакционный клиент: адресное
 * уведомление ставится в очередь той же транзакцией, что и правка наряда
 * (ADR-091), и читать адрес мимо неё нельзя.
 */
export async function findDeliveryTarget(
  id: string,
  client: Prisma.TransactionClient = db,
): Promise<DeliveryTarget | null> {
  const row = await client.adminUser.findUnique({ where: { id }, select: deliverySelect });
  return row === null ? null : toDeliveryTarget(row);
}

/** Вся команда с адресами: раздел «Уведомления» показывает, кто на связи. */
export async function listDeliveryTargets(): Promise<readonly DeliveryTarget[]> {
  const rows = await db.adminUser.findMany({
    select: deliverySelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { login: 'asc' }],
  });

  return rows.map(toDeliveryTarget);
}

/** Почта для уведомлений. Пустое значение — «адреса нет», а не пустая строка. */
export async function setDeliveryEmail(id: string, email: string | null): Promise<void> {
  const trimmed = email?.trim() ?? '';
  await db.adminUser.update({ where: { id }, data: { email: trimmed === '' ? null : trimmed } });
}

/**
 * Привязка чата к учётной записи. Chat ID человек не знает и узнать сам не
 * может — его приносит сам телеграм, командой боту.
 */
export async function bindTelegramChat(id: string, chatId: string): Promise<void> {
  await db.adminUser.update({ where: { id }, data: { telegramChatId: chatId } });
}

/**
 * Отвязка чата: человек написал боту «стоп» или владелец снял привязку.
 * Возвращает имена тех, у кого чат сняли, — их нужно назвать в ответе.
 */
export async function unbindTelegramChat(chatId: string): Promise<readonly string[]> {
  const rows = await db.adminUser.findMany({
    where: { telegramChatId: chatId },
    select: deliverySelect,
  });

  if (rows.length === 0) return [];

  await db.adminUser.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramChatId: null },
  });
  return rows.map((row) => toDeliveryTarget(row).name);
}

/** Снять привязку у конкретной учётной записи — из раздела «Уведомления». */
export async function unbindTelegramChatOf(id: string): Promise<void> {
  await db.adminUser.update({ where: { id }, data: { telegramChatId: null } });
}
