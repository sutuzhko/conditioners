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

/** Сутки в минутах: 1440 — полночь следующего дня, предел рабочего окна в схеме. */
const DAY_MINUTES = 24 * 60;

/**
 * Минуты от московской полуночи в значение поля времени: 540 → «09:00».
 *
 * 🔴 Приведение живёт в форме, а не в схеме: календарю нужно число, чтобы
 * рисовать сетку, а владельцу — часы, чтобы их набрать (ADR-138). Свободный
 * текст часов работы для сетки не годится вовсе — его пришлось бы разбирать.
 *
 * Конец суток (1440) показывается как «00:00»: поле времени в браузере суток
 * не знает и «24:00» не принимает, а полночь — это и есть конец дня.
 */
export function minutesToTime(minutes: number): string {
  const inDay = ((Math.trunc(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

  return `${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}`;
}

/**
 * Значение поля времени в минуты от полуночи: «09:30» → 570.
 *
 * `null` — поле пустое или в нём мусор. Очищенное поле не превращается в
 * полночь: ключ уйдёт из тела запроса, и сервер подставит умолчание из схемы,
 * а не откроет календарь с нуля часов.
 */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match === null) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
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
