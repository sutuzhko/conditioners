/** Чтение и запись значения по пути, отправка группы — контракт docs/API.md §5. */
import type { SettingKey } from '@/entities/settings/model';

import type { GroupValue, SaveResult } from './model';

/**
 * Значение по пути вида `messengerButtons.telegram`.
 *
 * Отсутствующая ветка — это не ошибка: группа могла быть сохранена раньше,
 * чем в схему добавили поле, и форма обязана открыться на старых данных.
 */
export function readPath(value: GroupValue, path: string): unknown {
  let current: unknown = value;
  for (const step of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[step];
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
  const base: GroupValue =
    typeof nested === 'object' && nested !== null ? { ...(nested as GroupValue) } : {};

  return { ...value, [head]: writePath(base, rest.join('.'), next) };
}

/**
 * Тело ошибки — `{ error: { code, message, field? } }` (docs/API.md §12).
 *
 * Поле одно, а не список: сервер отвечает по первой непройденной проверке
 * Zod. Форма показывает его у нужного поля и общее сообщение над кнопкой.
 */
type ApiErrorBody = {
  readonly code?: string;
  readonly message?: string;
  readonly field?: string;
};

function readApiError(payload: unknown): ApiErrorBody | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return undefined;

  const { code, message, field } = error as Record<string, unknown>;
  return {
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof message === 'string' ? { message } : {}),
    ...(typeof field === 'string' && field !== '' ? { field } : {}),
  };
}

export async function putGroup(key: SettingKey, value: GroupValue): Promise<SaveResult> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  } catch {
    return { ok: false, message: 'Не удалось связаться с сервером. Изменения не сохранены' };
  }

  if (response.ok) return { ok: true };

  if (response.status === 401) {
    return { ok: false, message: 'Сессия истекла. Войдите заново' };
  }

  /* Тело ошибки может не быть JSON — например, если запрос не дошёл до
     обработчика. Разбор не должен превращать отказ сервера в отказ разбора. */
  const error = readApiError(await response.json().catch(() => null));

  /* Сообщение Zod объясняет, что именно не так («Проверьте адрес почты»), и
     оно точнее любого нашего обобщения — показываем его как есть. */
  const message = error?.message ?? 'Сервер не принял изменения. Попробуйте ещё раз';

  if (error?.field !== undefined) {
    return { ok: false, message, fieldErrors: { [error.field]: message } };
  }

  return { ok: false, message };
}
