/**
 * Настройки компании. Читаются публичными страницами, пишутся только из админки.
 */
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { scheduleSchema, settingSchemas, type SettingKey } from '@/entities/settings/model';
import type { WorkWindow } from '@/entities/crm/lib/overtime';
import type { InstallRates } from '@/entities/price/model';
import {
  PLACEHOLDER,
  SETTING_KEYS,
  isSettingKey,
  requiredFields,
} from '@/server/repo/settings-schemas';

export type SettingsMap = Partial<Record<SettingKey, unknown>>;

export async function getGroup(key: SettingKey): Promise<unknown | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getAll(): Promise<SettingsMap> {
  const rows = await db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const result: SettingsMap = {};
  for (const row of rows) {
    // ключ пришёл из базы: выборка ограничена реестром, но проверяет это
    // запрос, а не тип — сужаем тем же предикатом, что и остальной код
    if (isSettingKey(row.key)) result[row.key] = row.value;
  }
  return result;
}

/**
 * Клиент передаётся, когда запись группы — часть чужой транзакции (прайс + ставки).
 *
 * Значение типизировано входным JSON Prisma, а не `unknown`: приводить его к
 * `never` на каждом из двух полей `upsert` было единственной причиной, по
 * которой здесь стоял `as` (ADR-108). Сюда приходит разобранный схемой
 * результат — он и есть JSON.
 */
export async function putGroup(
  key: SettingKey,
  value: Prisma.InputJsonValue,
  client: Prisma.TransactionClient = db,
): Promise<void> {
  await client.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export type ReadinessIssue = {
  field: string;
  /**
   * `invalid` — группа не проходит собственную схему.
   *
   * 🔴 Отдельная причина, а не «пусто»: значение в базе есть, владелец его
   * видит в форме, но публичная страница разбирает группу с умолчаниями и не
   * показывает ничего. Без этой проверки панель отвечала «заполнено», а футер
   * стоял пустым — ровно тот молча очищенный футер, которого боится ADR-112.
   */
  reason: 'missing' | 'empty' | 'placeholder' | 'invalid';
};

export type ReadinessGroup = {
  key: SettingKey;
  ready: boolean;
  issues: ReadinessIssue[];
};

export type ReadinessReport = {
  ready: boolean;
  groups: ReadinessGroup[];
};

/** Сужение вместо приведения типа: `as` на проекте запрещён (ADR-108). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmpty);
  return false;
}

/** Заглушка ищется по всему дереву группы: она может лежать и внутри массива. */
function findPlaceholders(value: unknown, path: string, into: ReadinessIssue[]): void {
  if (typeof value === 'string') {
    if (value.includes(PLACEHOLDER)) into.push({ field: path, reason: 'placeholder' });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findPlaceholders(item, `${path}[${index}]`, into));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      findPlaceholders(nested, path === '' ? key : `${path}.${key}`, into);
    }
  }
}

/**
 * Поля, которые группа заполнила, но её собственная схема не приняла.
 *
 * 🔴 Публичные страницы разбирают группу той же схемой и при отказе берут
 * умолчания (`loadSettings`): битая запись не имеет права уронить сайт. Цена
 * этой терпимости — молчание: реквизиты с опиской в ИНН исчезают из футера
 * целиком, а не одним полем. Готовность обязана означать «сайт это покажет»,
 * поэтому отказ схемы попадает в отчёт наравне с пустым полем.
 *
 * Такая запись появляется одним способом — она сохранена до того, как поле
 * стало проверяться. Через админку её больше не завести: маршрут настроек
 * валидирует тело той же схемой.
 */
function collectInvalid(key: SettingKey, value: unknown, into: ReadinessIssue[]): void {
  const parsed = settingSchemas[key].safeParse(value);
  if (parsed.success) return;

  for (const issue of parsed.error.issues) {
    const field = issue.path.join('.');
    /* Пустое и заглушку уже назвали проверки выше — второй строкой об одном
       и том же поле отчёт только запутает владельца. */
    if (into.some((existing) => existing.field === field)) continue;

    into.push({ field, reason: 'invalid' });
  }
}

/**
 * Что осталось незаполненным перед запуском — docs/API.md §5.
 * Сохранять неполные данные можно, уезжать с ними в прод — нет.
 */
export function checkReadiness(settings: SettingsMap): ReadinessReport {
  const groups = SETTING_KEYS.map((key): ReadinessGroup => {
    const value = settings[key];
    const issues: ReadinessIssue[] = [];

    if (value === undefined || value === null) {
      issues.push({ field: '', reason: 'missing' });
      return { key, ready: false, issues };
    }

    const record = isRecord(value) ? value : {};

    /* Набор обязательного берётся с оглядкой на саму группу: у реквизитов он
       зависит от формы регистрации (ADR-112). */
    for (const field of requiredFields(key, value)) {
      if (isEmpty(record[field])) issues.push({ field, reason: 'empty' });
    }

    findPlaceholders(value, '', issues);
    collectInvalid(key, value, issues);

    return { key, ready: issues.length === 0, issues };
  });

  return { ready: groups.every((group) => group.ready), groups };
}

export async function readiness(): Promise<ReadinessReport> {
  return checkReadiness(await getAll());
}

/** Ставки калькулятора — доменный тип: ставки и формула живут в одном месте. */
export type Extras = InstallRates;

/**
 * Ставки калькулятора лежат в той же группе настроек.
 * Возвращается null, а не нули: подставить свою цифру вместо незаполненной
 * ставки — это выдумать факт о компании (инвариант 8).
 */
/**
 * Рабочее окно компании — минуты от московской полуночи (ADR-128).
 *
 * Читается при каждой записи дела или наряда, а не кешируется: правок в день
 * десятки, а настройка — одна строка в той же базе. Незаполненная группа даёт
 * умолчание схемы, а не пустой день.
 */
export async function workWindow(): Promise<WorkWindow> {
  const parsed = scheduleSchema.safeParse((await getGroup('schedule')) ?? {});

  return parsed.success ? parsed.data : scheduleSchema.parse({});
}

export async function getExtras(): Promise<Extras | null> {
  const parsed = settingSchemas.extras.safeParse(await getGroup('extras'));
  return parsed.success ? parsed.data : null;
}
