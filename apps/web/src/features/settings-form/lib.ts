/** Чтение и запись значения по пути, отправка группы — контракт docs/API.md §5. */
import type { SettingKey } from '@/entities/settings/model';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import type { FieldDescriptor, GroupDescriptor, GroupValue, SaveResult } from './model';

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

/**
 * Копия группы без значения по пути. Ключ именно убирается, а не обнуляется:
 * пустая строка на месте убранного поля — это «владелец очистил», а форма
 * говорит «поля здесь нет».
 */
export function dropPath(value: GroupValue, path: string): GroupValue {
  const [head, ...rest] = path.split('.');
  if (head === undefined || !Object.hasOwn(value, head)) return value;

  if (rest.length > 0) {
    const nested = value[head];
    return isRecord(nested) ? { ...value, [head]: dropPath(nested, rest.join('.')) } : value;
  }

  const next: GroupValue = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key !== head) next[key] = entry;
  }

  return next;
}

/**
 * Значение группы с проставленным переключателем состава.
 *
 * 🔴 Группа, сохранённая до появления вариантов, лежит в базе без него. Схема
 * такую запись разбирает по первому варианту (`withDefaultForm`), и проверка
 * готовности считает её так же — форма обязана читать её тем же способом.
 *
 * Пока не читала, ломалось молча и дважды. Владелец видел почти пустую форму:
 * поля обоих вариантов скрыты условием, потому что сравнивать не с чем, — а
 * заполненные значения при этом в базе есть. И переключение варианта не
 * спрашивало подтверждения: заполненных **видимых** полей нет, терять как
 * будто нечего, — после чего первое же сохранение затирало группу. Ровно тот
 * молча очищенный футер, против которого заводилось подтверждение (ADR-112).
 */
export function withGroupDefaults(group: GroupDescriptor, value: GroupValue): GroupValue {
  return group.fields.reduce((result, field) => {
    const [first] = field.options ?? [];
    if (field.resetsGroup !== true || first === undefined) return result;

    return typeof readPath(result, field.path) === 'string'
      ? result
      : writePath(result, field.path, first);
  }, value);
}

/**
 * Показывается ли поле при таком значении группы.
 *
 * Условие сравнивается со строкой: переключатель состава отдаёт строку, а
 * число или флажок в этой роли не встречались (ADR-112).
 */
export function isFieldVisible(field: FieldDescriptor, value: GroupValue): boolean {
  if (field.when === undefined) return true;

  const current = readPath(value, field.when.path);

  return typeof current === 'string' && field.when.equals.includes(current);
}

/** Поля, подходящие под текущее значение группы, в порядке описания. */
export function visibleFields(
  group: GroupDescriptor,
  value: GroupValue,
): readonly FieldDescriptor[] {
  return group.fields.filter((field) => isFieldVisible(field, value));
}

/**
 * Заполнено ли значение — с точки зрения владельца, а не типа.
 *
 * Ноль и `false` разделены сознательно: «0» в числовом поле владелец видит и
 * потеряет, а снятый флажок терять нечего.
 */
function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;

  return true;
}

/**
 * Подписи заполненных полей группы, кроме поля `exceptPath`.
 *
 * Нужны подтверждению смены состава: окно обязано назвать исчезающее словами,
 * а «данные будут удалены» владельцу не говорит ничего (ADR-112, ADR-113).
 * Пустой список означает, что терять нечего и спрашивать не о чем.
 */
export function filledFieldLabels(
  group: GroupDescriptor,
  value: GroupValue,
  exceptPath: string,
): readonly string[] {
  /* 🔴 Считается по всей группе, а не по видимым полям: стирается группа
     целиком, и промолчать о значении, которое сейчас скрыто условием, значит
     не назвать то, что исчезнет. Путь берётся один раз — у вариантов есть
     одноимённые поля («Наименование» у обоих), и владельцу незачем читать про
     одно значение дважды; подпись берётся у того поля, которое сейчас на
     экране. */
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const field of [...visibleFields(group, value), ...group.fields]) {
    if (field.path === exceptPath || seen.has(field.path)) continue;
    seen.add(field.path);

    if (isFilled(readPath(value, field.path))) labels.push(field.label);
  }

  return labels;
}

/**
 * Значение без полей, скрытых условием: на сервер уходит ровно то, что видно
 * на экране.
 *
 * Спрятанное значение всплывает в выгрузке или в разметке тогда, когда его
 * никто не ждёт (ADR-112), — а `.strict()` в схеме такое тело просто отвергнет.
 */
export function withoutHiddenFields(group: GroupDescriptor, value: GroupValue): GroupValue {
  return group.fields.reduce(
    (result, field) => (isFieldVisible(field, value) ? result : dropPath(result, field.path)),
    value,
  );
}

/**
 * Машинная дата `2015-03-12` для поля ввода. Всё остальное — пустое поле:
 * группу могли сохранить до появления поля, а показывать мусор датой нельзя.
 */
export function toDateValue(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : '';
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
