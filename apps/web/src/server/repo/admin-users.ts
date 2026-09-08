/**
 * Люди, которые заходят в панель: владелец и монтажники (ADR-092).
 *
 * Пароль наружу не отдаётся ни в каком виде — `StaffCard` его не содержит.
 * Из базы `passwordHash` читает только вход.
 */
import type {
  AdminPermission as DbPermission,
  AdminRole as DbRole,
  Employment as DbEmployment,
  Prisma,
} from '@prisma/client';

import type { AdminRole, InstallerNoteCard, StaffCard, StaffDetails } from '@/entities/staff/model';
import type { AdminPermission } from '@/entities/staff/permissions';
import { db } from '@/server/db';
import { ApiException } from '@/server/api-error';
import { employmentFromDb, employmentToDb } from '@/server/repo/employment';
import { permissionsFromDb, permissionsToDb, roleFromDb, roleToDb } from '@/server/repo/roles';
import type { Employment } from '@/shared/lib/employment';

export type AdminUserRecord = {
  id: string;
  login: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
};

type StaffRow = {
  id: string;
  login: string;
  name: string | null;
  phone: string | null;
  role: DbRole;
  permissions: DbPermission[];
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
  permissions: true,
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
    role: roleFromDb(row.role),
    employment: employmentFromDb(row.employment),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

/** Та же карточка с ИНН — только для экранов владельца. */
function toDetails(row: StaffRow): StaffDetails {
  return { ...toCard(row), inn: row.inn, permissions: permissionsFromDb(row.permissions) };
}

export async function findByLogin(login: string): Promise<AdminUserRecord | null> {
  const row = await db.adminUser.findUnique({
    where: { login },
    select: { id: true, login: true, passwordHash: true, role: true, active: true },
  });

  if (row === null) return null;

  return { ...row, role: roleFromDb(row.role) };
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
 * Кто правит — сессия, из-под которой пришёл запрос.
 *
 * 🔴 Обязательный аргумент, а не необязательный с умолчанием. Пока раздел
 * «Сотрудники» был закрыт `withOwner`, вопрос «кто правит» имел один ответ, и
 * функции записи его не задавали. Разрешения администратора (ADR-344) этот
 * ответ размножили, и умолчание здесь означало бы «считаем, что владелец» —
 * ровно та подстановка, которой администратор с «Управлением людьми» менял
 * пароль владельцу.
 */
export type StaffActor = {
  readonly userId: string;
  readonly role: AdminRole;
};

/**
 * Кого этот человек вправе править в разделе «Сотрудники».
 *
 * 🔴 Правило про **роль цели**, а не про её имя или номер: администратор
 * распоряжается теми, кем управляет по работе, — менеджерами и монтажниками.
 * Учётная запись владельца и учётная запись равного администратора — дело
 * владельца (CRM §6.3, «Права других людей: администратор не правит»).
 *
 * 🔴 Почему пароль сюда входит. «Управление людьми» открывает заведение
 * сотрудника и заметки о нём, но смена пароля чужой учётной записи — это не
 * управление человеком, это вход под ним: пароль после смены знает тот, кто
 * его поставил, а все сессии владельца этим же действием гасятся. По
 * горизонтали цена та же: сбросив пароль равному администратору, человек
 * получает его набор разрешений — то есть обходит обещание «администратор не
 * меняет ни свои, ни чужие права», не трогая `/access` вовсе.
 *
 * Свою учётную запись правит каждый: это свой профиль, и им закрыт
 * `PATCH /api/admin/profile`.
 */
function mayManage(actor: StaffActor, target: { id: string; role: DbRole }): boolean {
  if (actor.role === 'owner') return true;
  if (actor.userId === target.id) return true;

  const role = roleFromDb(target.role);
  return actor.role === 'admin' && (role === 'manager' || role === 'installer');
}

/**
 * Отказ — общий на все действия над учётной записью: он не рассказывает, что
 * именно в цели особенного. Кто есть кто, администратор с открытым разделом
 * «Сотрудники» и так видит в списке, но повторять это в тексте отказа незачем.
 */
function assertMayManage(actor: StaffActor, target: { id: string; role: DbRole }): void {
  if (mayManage(actor, target)) return;

  throw new ApiException('forbidden', 'Эту учётную запись правит только владелец');
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
      role: roleToDb('installer'),
    },
    select: staffSelect,
  });

  return toCard(row);
}

/**
 * Правка учётной записи.
 *
 * Отвечает карточкой без ИНН: ту же функцию зовёт свой профиль, доступный
 * всем четырём ролям. Владелец видит сохранённый ИНН чтением карточки — форма
 * после успеха и так перечитывает страницу.
 *
 * 🔴 Кто правит — обязательный аргумент, и это не церемония. Здесь меняются
 * пароль, логин и признак доступа, то есть всё, из чего состоит вход в панель;
 * без имени действующего эта функция отдаёт учётную запись владельца любому,
 * кого пустил страж маршрута.
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
  actor: StaffActor,
): Promise<StaffCard> {
  const current = await db.adminUser.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (current === null) throw new ApiException('not_found', 'Сотрудник не найден');

  assertMayManage(actor, current);

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
 *
 * 🔴 Проверка роли цели стояла здесь и до разрешений, а у `update` — нет, и
 * ровно в этом зазоре администратор с «Управлением людьми» получал пароль
 * владельца: удалить его он не мог, а переписать — мог. Теперь обе функции
 * спрашивают одно и то же у одного правила.
 */
export async function remove(id: string, actor: StaffActor): Promise<void> {
  const row = await db.adminUser.findUnique({ where: { id }, select: { id: true, role: true } });
  if (row === null) throw new ApiException('not_found', 'Сотрудник не найден');

  if (row.role === 'OWNER') {
    throw new ApiException('forbidden', 'Учётную запись владельца удалить нельзя');
  }

  assertMayManage(actor, row);

  await db.adminUser.delete({ where: { id } });
}

/**
 * Роль и разрешения человека — то, что правит экран прав (ADR-344, issue #782,
 * #784).
 *
 * 🔴 Сессии этой правкой не закрываются намеренно. Смысл разрешений ровно в
 * том, что снятый переключатель действует немедленно и без повторного входа:
 * набор читается из базы на каждый запрос (`repo/sessions`), а выброс из
 * панели превратил бы «убрал раздел» в «выгнал человека».
 *
 * 🔴 Учётная запись владельца сюда не пускается вовсе. Понизить единственного
 * владельца — значит запереть панель снаружи: раздавать права станет некому.
 * А его собственный набор разрешений ничего не решает: страж их у владельца не
 * спрашивает, и правка выглядела бы настройкой, которая ни на что не влияет.
 */
export async function setAccess(
  id: string,
  input: {
    role?: AdminRole | undefined;
    permissions?: readonly AdminPermission[] | undefined;
  },
): Promise<StaffDetails> {
  const current = await db.adminUser.findUnique({ where: { id }, select: { role: true } });
  if (current === null) throw new ApiException('not_found', 'Сотрудник не найден');

  if (current.role === 'OWNER') {
    throw new ApiException('forbidden', 'Права владельца не настраиваются: он их раздаёт');
  }

  /* Второй рубеж под схемой (`assignableRoleSchema`): запрет, живущий в одном
     месте, обходится следующим маршрутом, который забыл его позвать. */
  if (input.role === 'owner') {
    throw new ApiException(
      'forbidden',
      'Владелец в системе один — вторую такую роль выдать нельзя',
    );
  }

  const role = input.role ?? roleFromDb(current.role);

  /* 🔴 Набор у не-администратора не принимается, а не гасится молча. Ответ
     `200` на то, чего не сохранили, — худший вид отказа: владелец расставил
     переключатели, увидел «Права сохранены» и ушёл уверенным, что настроил
     доступ. Разрешения спрашивают у одной роли, и набор у менеджера был бы
     настройкой, которой нет в доступе. */
  if (role !== 'admin' && input.permissions !== undefined && input.permissions.length > 0) {
    throw new ApiException(
      'validation_error',
      'Разрешения есть только у администратора: у остальных ролей доступ задан ролью целиком',
      'permissions',
    );
  }

  /* Смена роли на неадминистраторскую гасит набор: он перестал что-либо
     значить, и оставлять его в карточке значило бы показывать настройку,
     которая не работает. */
  const permissions = role === 'admin' ? (input.permissions ?? undefined) : [];

  const row = await db.adminUser.update({
    where: { id },
    data: {
      ...(input.role === undefined ? {} : { role: roleToDb(input.role) }),
      ...(permissions === undefined ? {} : { permissions: { set: permissionsToDb(permissions) } }),
    },
    select: staffSelect,
  });

  return toDetails(row);
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

/**
 * 🔴 Заметка удаляется внутри своего сотрудника, а не по одному номеру.
 *
 * Номера заметок у всех сотрудников из одного пространства, и удаление по
 * `noteId` в отрыве от `userId` означало бы, что адрес врёт о проверке:
 * раздел владельческий, привилегий это не повышает, но `setChecklistDone`
 * рядом сверяет принадлежность именно затем, чтобы «номер из адреса» не
 * работал сам по себе.
 */
export async function removeNote(userId: string, id: string): Promise<void> {
  const removed = await db.installerNote.deleteMany({ where: { id, userId } });
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
    role: roleFromDb(row.role),
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
