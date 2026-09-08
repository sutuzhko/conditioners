/**
 * Перевод роли и разрешений между перечислением базы и словарём приложения.
 *
 * 🔴 Один модуль на весь доступ к данным, а не копия словаря в каждом
 * репозитории. Копий было две — у сессий и у учётных записей, — и разойтись
 * они могли только молча: роль, переведённая в одном месте и не переведённая
 * в другом, снаружи выглядит как «человеку не открыт раздел».
 */
import type { AdminPermission as DbPermission, AdminRole as DbRole } from '@prisma/client';

import type { AdminRole } from '@/entities/staff/model';
import { sortPermissions, type AdminPermission } from '@/entities/staff/permissions';

/**
 * 🔴 `Record` держит полноту на этапе сборки: роль, добавленная в схему и
 * забытая здесь, не соберётся (ADR-344).
 */
const FROM_DB: Record<DbRole, AdminRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  INSTALLER: 'installer',
};

const TO_DB: Record<AdminRole, DbRole> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  manager: 'MANAGER',
  installer: 'INSTALLER',
};

/** Тот же словарь поиском по строке: значение из базы приходит как данные. */
const FROM_DB_LOOKUP = new Map<string, AdminRole>(Object.entries(FROM_DB));

/**
 * Роль из базы в роль приложения.
 *
 * 🔴 Неизвестное значение бросает, а не возвращает `undefined`, и это главное
 * в модуле. Молчаливый `undefined` не остаётся `undefined` надолго: он
 * доезжает до сессии, оттуда до `roles.includes(role)`, получает `false` — и
 * человек видит «Раздел закрыт». То есть **дефект схемы или данных выглядит
 * ровно как честный отказ в доступе**, и отличить одно от другого снаружи
 * нельзя ни человеку, ни сценарию. Такой отказ уже стоил одного захода
 * подрядчика: искали дыру в разграничении, а искать надо было промах словаря.
 *
 * Падение здесь громкое и с названным значением — чинить его дольше минуты не
 * получится. Аргумент принимается строкой намеренно: тип `DbRole` описывает
 * то, что знает сгенерированный клиент, а приходит то, что лежит в базе, — и
 * расходятся они ровно тогда, когда клиент собран до миграции.
 */
export function roleFromDb(value: string): AdminRole {
  const role = FROM_DB_LOOKUP.get(value);
  if (role === undefined) {
    throw new Error(
      `Роль «${value}» из базы не переводится: в словаре ролей её нет. ` +
        'Скорее всего, значение добавлено в перечисление схемы, но не в ' +
        'server/repo/roles.ts, либо клиент Prisma собран до миграции.',
    );
  }

  return role;
}

/** Роль приложения в значение перечисления базы. */
export function roleToDb(role: AdminRole): DbRole {
  return TO_DB[role];
}

/**
 * Разрешения администратора: тот же приём, что у ролей, и по той же причине.
 *
 * 🔴 `Record` держит полноту на этапе сборки — разрешение, добавленное в схему
 * и забытое здесь, не соберётся.
 */
const PERMISSION_FROM_DB: Record<DbPermission, AdminPermission> = {
  OVERVIEW: 'overview',
  CRM: 'crm',
  ORDERS: 'orders',
  LEADS: 'leads',
  CLIENTS: 'clients',
  TEAM: 'team',
  STOCK: 'stock',
  CATALOG: 'catalog',
  KNOWLEDGE: 'knowledge',
  REVIEWS: 'reviews',
  COMPANY: 'company',
  PRICES: 'prices',
  NOTIFICATIONS: 'notifications',
  DATA_DELETE: 'data_delete',
  MONEY: 'money',
  COMPANY_SETTINGS: 'company_settings',
  PEOPLE: 'people',
  ACTIVITY_PURGE: 'activity_purge',
};

const PERMISSION_TO_DB: Record<AdminPermission, DbPermission> = {
  overview: 'OVERVIEW',
  crm: 'CRM',
  orders: 'ORDERS',
  leads: 'LEADS',
  clients: 'CLIENTS',
  team: 'TEAM',
  stock: 'STOCK',
  catalog: 'CATALOG',
  knowledge: 'KNOWLEDGE',
  reviews: 'REVIEWS',
  company: 'COMPANY',
  prices: 'PRICES',
  notifications: 'NOTIFICATIONS',
  data_delete: 'DATA_DELETE',
  money: 'MONEY',
  company_settings: 'COMPANY_SETTINGS',
  people: 'PEOPLE',
  activity_purge: 'ACTIVITY_PURGE',
};

const PERMISSION_FROM_DB_LOOKUP = new Map<string, AdminPermission>(
  Object.entries(PERMISSION_FROM_DB),
);

/**
 * Набор разрешений из базы.
 *
 * 🔴 Неизвестное значение бросает — по тому же доводу, что у роли: молчаливый
 * пропуск превратил бы дефект схемы в «раздел вам не открыт», а отличить одно
 * от другого снаружи нельзя. Здесь довод даже сильнее: пропущенное разрешение
 * закрывает человеку раздел, который владелец ему выдал, и виноватым выглядит
 * экран прав.
 *
 * Порядок приводится к порядку словаря: набор — это множество, и читатель не
 * должен зависеть от того, в каком порядке его записал Postgres.
 */
export function permissionsFromDb(values: readonly string[]): AdminPermission[] {
  return sortPermissions(
    values.map((value) => {
      const permission = PERMISSION_FROM_DB_LOOKUP.get(value);
      if (permission === undefined) {
        throw new Error(
          `Разрешение «${value}» из базы не переводится: в словаре разрешений его нет. ` +
            'Скорее всего, значение добавлено в перечисление схемы, но не в ' +
            'server/repo/roles.ts, либо клиент Prisma собран до миграции.',
        );
      }

      return permission;
    }),
  );
}

/** Набор разрешений приложения в значения перечисления базы. */
export function permissionsToDb(permissions: readonly AdminPermission[]): DbPermission[] {
  return sortPermissions(permissions).map((permission) => PERMISSION_TO_DB[permission]);
}
