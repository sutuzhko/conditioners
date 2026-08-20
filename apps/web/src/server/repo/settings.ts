/**
 * Настройки компании. Читаются публичными страницами, пишутся только из админки.
 */
import { db } from '@/server/db';
import { settingSchemas, type SettingKey } from '@/entities/settings/model';
import type { InstallRates } from '@/entities/price/model';
import {
  PLACEHOLDER,
  REQUIRED_FIELDS,
  SETTING_KEYS,
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
    result[row.key as SettingKey] = row.value;
  }
  return result;
}

export async function putGroup(key: SettingKey, value: unknown): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}

export type ReadinessIssue = {
  field: string;
  reason: 'missing' | 'empty' | 'placeholder';
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

    const record = typeof value === 'object' ? (value as Record<string, unknown>) : {};

    for (const field of REQUIRED_FIELDS[key]) {
      if (isEmpty(record[field])) issues.push({ field, reason: 'empty' });
    }

    findPlaceholders(value, '', issues);

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
export async function getExtras(): Promise<Extras | null> {
  const parsed = settingSchemas.extras.safeParse(await getGroup('extras'));
  return parsed.success ? parsed.data : null;
}
