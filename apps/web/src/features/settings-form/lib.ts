/** Чтение и запись значения по пути, отправка группы — контракт docs/API.md §5. */
import type { SettingKey } from '@/entities/settings/model';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import type { GroupValue, SaveResult } from './model';

/** Сужение вместо приведения типа: `as` на проекте запрещён. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Сохранённая группа настроек из базы — какой угодно JSON.
 *
 * Форма открывается на чём угодно: массив, число и `null` из базы означают
 * ровно то же, что и отсутствие группы, — пустую форму. Страница, которая
 * приводила значение сама, повторяла эту проверку дважды и заканчивала её
 * `as` (ADR-108).
 */
export function toGroupValue(stored: unknown): GroupValue {
  return isRecord(stored) && !Array.isArray(stored) ? stored : {};
}

/**
 * Значение по пути вида `messengerButtons.telegram`.
 *
 * Отсутствующая ветка — это не ошибка: группа могла быть сохранена раньше,
 * чем в схему добавили поле, и форма обязана открыться на старых данных.
 */
export function readPath(value: GroupValue, path: string): unknown {
  let current: unknown = value;
  for (const step of path.split('.')) {
    if (!isRecord(current)) return undefined;
    current = current[step];
  }
  return current;
}

/**
 * Копия группы с заменённым значением по пути. Копия, а не правка на месте:
 * состояние React сравнивается по ссылке, и правка на месте не перерисует форму.
 */
export function writePath(value: GroupValue, path: string, next: unknown): GroupValue {
  const [head, ...rest] = path.split('.');
  if (head === undefined) return value;

  if (rest.length === 0) return { ...value, [head]: next };

  const nested = value[head];
  const base: GroupValue = isRecord(nested) ? { ...nested } : {};

  return { ...value, [head]: writePath(base, rest.join('.'), next) };
}

/*
 * Формулировки этой формы, включая её собственный текст про сессию. Они жили
 * прямо здесь до общего хелпера — в content.ts не переносятся, чтобы миграция
 * не меняла видимых владельцу слов (ADR-030).
 */
const SAVE_TEXTS = {
  network: 'Не удалось связаться с сервером. Изменения не сохранены',
  server: 'Сервер не принял изменения. Попробуйте ещё раз',
  session: 'Сессия истекла. Войдите заново',
} as const;

export async function putGroup(key: SettingKey, value: GroupValue): Promise<SaveResult> {
  // общий разбор ответа админского API (ADR-030): свои остаются только формулировки
  const result = await adminRequest(
    `/api/admin/settings/${key}`,
    jsonInit('PUT', value),
    SAVE_TEXTS,
  );

  if (result.ok) return { ok: true };

  /* Сообщение Zod объясняет, что именно не так («Проверьте адрес почты»), и
     оно точнее любого нашего обобщения — показываем его как есть. Если сервер
     назвал поле, то же сообщение встаёт рядом с этим полем. */
  if (result.field !== undefined) {
    return { ok: false, message: result.message, fieldErrors: { [result.field]: result.message } };
  }

  return { ok: false, message: result.message };
}
