import { z } from 'zod';

import { adminRoleSchema, type AdminRole } from '@/entities/staff/model';
import { momentOf, parseDayKey, shiftDay, type DayKey } from '@/shared/lib/calendar';

/**
 * Событие журнала: кто, когда, что сделал и над чем (ADR-345).
 *
 * 🔴 Персональных данных здесь нет ни в одном поле, и это не упущение, а
 * устройство (инвариант 12). Событие называет сущность и её `id`; имя,
 * телефон и адрес читаются из самой сущности при показе. Тогда удаление
 * клиента по 152-ФЗ убирает его данные и из журнала, а строка «менеджер завёл
 * наряд» остаётся.
 */

/**
 * Вид события — от него зависит срок хранения: обычное живёт 12 месяцев,
 * событие безопасности 36 (ADR-345).
 */
export const activityKindSchema = z.enum(['regular', 'security']);

export type ActivityKind = z.infer<typeof activityKindSchema>;

/**
 * Был ли у события автор — учётная запись панели.
 *
 * 🔴 Отвечает на вопрос «почему нет имени», и ответов ровно два: учётную
 * запись удалили (`user` без автора) либо автора не было вовсе (`system`).
 * Без этого поля оба состояния выглядят одинаково и различить их задним
 * числом нечем (ADR-345, решение о роде автора).
 */
export const activityActorKindSchema = z.enum(['user', 'system']);

export type ActivityActorKind = z.infer<typeof activityActorKindSchema>;

/**
 * Над какой сущностью совершено событие.
 *
 * Список растёт фазами: сейчас в журнал пишет только модерация отзывов, фаза
 * 2 добавляет остальные разделы. Держится объединением, а не перечислением
 * базы, — см. `action`.
 *
 * 🔴 `activity` — сам журнал, и сущность у него есть по-настоящему: чистка за
 * период совершается над журналом, а не над отзывом или нарядом. Без неё след
 * чистки пришлось бы приписать чужой сущности, и отбор по сущности начал бы
 * врать (ADR-345, фаза 5).
 */
export const activityEntitySchema = z.enum(['review', 'activity']);

export type ActivityEntity = z.infer<typeof activityEntitySchema>;

/**
 * Что именно сделано — `раздел.действие`.
 *
 * 🔴 Объединение в коде, а не `enum` в базе. Набор растёт каждой фазой и
 * каждым новым разделом панели: перечисление базы требовало бы миграции на
 * каждое добавление и не давало бы взамен ничего — опечатка здесь не
 * компилируется, а мимо этого объединения событие не записать: сервис не
 * принимает строку.
 *
 * Точка в имени не декоративная: по её левой части журнал отбирается по
 * разделу (фаза 4), и разбирать для этого русские подписи не придётся.
 */
export const activityActionSchema = z.enum([
  'review.publish',
  'review.unpublish',
  'review.reject',
  'review.archive',
  'activity.cleanup',
]);

export type ActivityAction = z.infer<typeof activityActionSchema>;

/**
 * Значение поля в составе изменений. Скаляр, а не что угодно: «было → стало» —
 * это про одно поле, и объект внутри означал бы, что в журнал уехала часть
 * сущности целиком, то есть ровно та копия, которой здесь быть не должно.
 */
const activityValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Состав изменений: поле → «было» и «стало».
 *
 * 🔴 Хранится отдельным полем записи, потому что чистится первым (ADR-345):
 * ссылка на сущность живёт весь срок события, а значения полей — нет.
 */
export const activityChangesSchema = z.record(
  z.string(),
  z.object({ from: activityValueSchema, to: activityValueSchema }),
);

export type ActivityChanges = z.infer<typeof activityChangesSchema>;

/**
 * Подписи действий для журнала.
 *
 * 🔴 Отглагольные существительные, а не «Опубликовал»: в панели работают и
 * женщины, а согласовать род с именем автора строка таблицы не может — оно
 * стоит в соседней колонке и бывает пустым.
 *
 * `Record` по объединению, а не свободный словарь: новое действие без подписи
 * не компилируется.
 */
export const ACTIVITY_ACTION_TITLES: Readonly<Record<ActivityAction, string>> = {
  'review.publish': 'Публикация отзыва',
  'review.unpublish': 'Снятие отзыва с публикации',
  'review.reject': 'Отклонение отзыва',
  'review.archive': 'Отправка отзыва в архив',
  'activity.cleanup': 'Чистка журнала',
};

/** Как называется сущность в колонке «Над чем». */
export const ACTIVITY_ENTITY_TITLES: Readonly<Record<ActivityEntity, string>> = {
  review: 'Отзыв',
  activity: 'Журнал',
};

/*
 * Поиск подписи идёт по `Map`, собранной из тех же словарей.
 *
 * 🔴 Незнакомый ключ отдаётся как есть, а не роняет страницу и не прячет
 * строку. Действия переименовываются между фазами, а записанные события
 * остаются: журнал, скрывающий то, что не смог назвать, доказывает ровно
 * столько же, сколько пустой.
 *
 * Словари при этом остаются `Record` по объединению — новое действие без
 * подписи не компилируется.
 */
const ACTION_TITLE_BY_KEY = new Map<string, string>(Object.entries(ACTIVITY_ACTION_TITLES));
const ENTITY_TITLE_BY_KEY = new Map<string, string>(Object.entries(ACTIVITY_ENTITY_TITLES));

export function activityActionTitle(action: string): string {
  return ACTION_TITLE_BY_KEY.get(action) ?? action;
}

export function activityEntityTitle(entity: string): string {
  return ENTITY_TITLE_BY_KEY.get(entity) ?? entity;
}

// ---------- Раздел панели, из которого пришло событие ----------

/**
 * Раздел — левая часть ключа действия: `review.unpublish` → `review`.
 *
 * 🔴 Тип выводится из самого объединения действий, а не выписан рядом. Новое
 * действие с новым разделом расширяет `ActivitySection` само, и подпись к нему
 * становится обязательной в тот же момент — `Record` ниже перестаёт быть
 * полным, и код не компилируется. Список, выписанный руками, отставал бы молча.
 */
type SectionOfAction<A extends string> = A extends `${infer Section}.${string}` ? Section : never;

export type ActivitySection = SectionOfAction<ActivityAction>;

/**
 * Разделы для отбора — в том порядке, в каком они стоят в колонке панели.
 *
 * Полноту держит тест рядом: он собирает разделы из самих действий и сверяет
 * с этим списком, поэтому забытый раздел краснеет, а не пропадает из отбора.
 */
export const ACTIVITY_SECTIONS: readonly ActivitySection[] = ['review', 'activity'];

/** Как называется раздел в отборе. Незнакомый ключ невозможен: `Record` полон. */
export const ACTIVITY_SECTION_TITLES: Readonly<Record<ActivitySection, string>> = {
  review: 'Отзывы',
  activity: 'Журнал',
};

/** Раздел действия. Ключ без точки — сам себе раздел: так читается и старая запись. */
export function activitySectionOf(action: string): string {
  const dot = action.indexOf('.');
  return dot === -1 ? action : action.slice(0, dot);
}

/**
 * Действия раздела — закрытый список, а не поиск по началу строки.
 *
 * 🔴 Отбор уходит в базу как `action IN (…)`, и это не украшение: сравнение с
 * началом строки (`LIKE 'review.%'`) индексом по `action` не обслуживается при
 * русской сортировке, то есть на журнале в 50 000 строк каждый отбор по
 * разделу читал бы таблицу целиком. Список известен на этапе компиляции —
 * мимо объединения действий событие всё равно не записать.
 */
export function activityActionsOfSection(section: string): readonly string[] {
  return activityActionSchema.options.filter((action) => activitySectionOf(action) === section);
}

// ---------- Отбор журнала ----------

/**
 * 🔴 Отбор живёт в адресе, а не в состоянии компонента (ADR-105): найденную
 * страницу журнала можно прислать себе ссылкой, а «назад» возвращает к
 * прошлому отбору. Раздел от этого не платит ни байтом бюджета: форма уходит
 * обычным `GET`.
 */
export type ActivityFilter = {
  /** Учётная запись автора. Пустая строка — все авторы. */
  readonly actor: string;
  /**
   * Роль автора — **сегодняшняя**, а не та, что была в момент действия.
   *
   * 🔴 Копии роли у события нет, и заводить её сейчас значило бы решать за
   * фазу 3, которая пишет события смены роли: пока их нет, вопрос «кем он был
   * в среду» журналу не задают, а лишняя колонка в таблице на 50 000 строк
   * переживёт не одно переписывание. Отбор поэтому отвечает на вопрос «что
   * делали менеджеры» так, как он и звучит в панели: менеджеры — те, кто
   * числится менеджером сейчас. Событие без автора роли не имеет вовсе и в
   * такой отбор не попадает.
   */
  readonly role: AdminRole | undefined;
  readonly section: ActivitySection | undefined;
  readonly entity: ActivityEntity | undefined;
  /** Первый день периода включительно, ключ дня: `2026-09-01`. */
  readonly from: DayKey | undefined;
  /** Последний день периода включительно — целиком, до московской полуночи. */
  readonly to: DayKey | undefined;
};

export const EMPTY_ACTIVITY_FILTER: ActivityFilter = {
  actor: '',
  role: undefined,
  section: undefined,
  entity: undefined,
  from: undefined,
  to: undefined,
};

/**
 * Что журнал читает из адреса.
 *
 * 🔴 Значение параметра — строка **или массив строк**, и это не перестраховка:
 * повторённый параметр (`?actor=a&actor=b`) Next отдаёт массивом. Тип,
 * обещавший строку, врал ровно в том месте, где раздел обещает мягкость к
 * мусору в адресе.
 */
export type ActivitySearchParams = {
  readonly page?: string | readonly string[] | undefined;
  readonly actor?: string | readonly string[] | undefined;
  readonly role?: string | readonly string[] | undefined;
  readonly section?: string | readonly string[] | undefined;
  readonly entity?: string | readonly string[] | undefined;
  readonly from?: string | readonly string[] | undefined;
  readonly to?: string | readonly string[] | undefined;
};

/**
 * Одно значение параметра адреса.
 *
 * 🔴 Повторённый параметр — это мусор, а мусор снимает условие, а не роняет
 * раздел. Массив здесь не «берём первый»: `?actor=a&actor=b` не значит ни `a`,
 * ни `b`, и выбрать за человека одно из двух — значит показать ему отбор,
 * которого он не просил. Второе значение и `undefined` дают одно и то же —
 * условия нет.
 */
export function activityParam(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Отбор из адреса.
 *
 * 🔴 Мусор в параметре снимает условие, а не роняет раздел: адрес правят
 * руками и присылают друг другу, и отказ вместо журнала там ничего не
 * объясняет (issue #341). Ровно так же разбирается отбор отзывов.
 */
export function activityFilterOf(params: ActivitySearchParams): ActivityFilter {
  const role = adminRoleSchema.safeParse(activityParam(params.role));
  const section = activityParam(params.section) ?? '';
  const entity = activityEntitySchema.safeParse(activityParam(params.entity));

  return {
    actor: activityParam(params.actor)?.trim() ?? '',
    role: role.success ? role.data : undefined,
    section: ACTIVITY_SECTIONS.find((known) => known === section),
    entity: entity.success ? entity.data : undefined,
    from: parseDayKey(activityParam(params.from) ?? '') ?? undefined,
    to: parseDayKey(activityParam(params.to) ?? '') ?? undefined,
  };
}

/** Условия отбора как параметры адреса: их несут за собой ссылки разбивки. */
export function activityFilterQuery(filter: ActivityFilter): Record<string, string> {
  return {
    ...(filter.actor === '' ? {} : { actor: filter.actor }),
    ...(filter.role === undefined ? {} : { role: filter.role }),
    ...(filter.section === undefined ? {} : { section: filter.section }),
    ...(filter.entity === undefined ? {} : { entity: filter.entity }),
    ...(filter.from === undefined ? {} : { from: filter.from }),
    ...(filter.to === undefined ? {} : { to: filter.to }),
  };
}

/** Выбрано ли хоть что-то: от этого зависит, какое пустое состояние показать. */
export function activityFilterOn(filter: ActivityFilter): boolean {
  return Object.keys(activityFilterQuery(filter)).length > 0;
}

/**
 * Период из ключей дня — в моменты времени.
 *
 * 🔴 Календарный день начинается московской полуночью, а не полуночью UTC
 * (ADR-080): «за 8 сентября» обязано покрывать сутки в Туле целиком. Верхняя
 * граница отдаётся **исключающей** — полночь следующего дня: последняя
 * миллисекунда суток в сравнении `lte` теряет события, записанные внутри неё.
 */
export function activityPeriod(filter: {
  readonly from: DayKey | undefined;
  readonly to: DayKey | undefined;
}): { readonly since: Date | undefined; readonly until: Date | undefined } {
  return {
    since: filter.from === undefined ? undefined : dayStart(filter.from),
    until: filter.to === undefined ? undefined : dayAfter(filter.to),
  };
}

/** Московская полночь этого дня. */
function dayStart(day: DayKey): Date {
  return momentOf(day, '00:00');
}

/** Московская полночь следующего дня — исключающая верхняя граница суток. */
function dayAfter(day: DayKey): Date {
  return momentOf(shiftDay(day, 1), '00:00');
}

// ---------- Что у записи правится, а что нет ----------

/**
 * Пометка человека — единственное правимое поле записи (ADR-345, инвариант 7).
 *
 * Пустая строка стирает пометку: «разобрались» иногда оказывается написанным
 * не у той строки, и убрать написанное — не то же самое, что переписать
 * событие.
 */
export const activityNoteSchema = z.object({
  note: z
    .string({ invalid_type_error: 'Пометка должна быть текстом' })
    .trim()
    .max(2000, { message: 'Не длиннее 2000 символов' }),
});

export type ActivityNoteInput = z.infer<typeof activityNoteSchema>;

/**
 * Поля записи, которые не правятся ничем и никогда.
 *
 * 🔴 Перечень заведён ради отказа с внятным кодом, а не ради валидации формы.
 * Строгая схема ответила бы на попытку переписать автора «400, лишнее поле» —
 * то есть «поправьте тело запроса и повторите». Здесь правильный ответ другой:
 * этого нельзя, и повтор не поможет. Журнал, в котором можно переписать
 * автора, время или состав изменений, доказывает ровно столько же, сколько
 * пустой (ADR-345, инвариант 7).
 */
export const ACTIVITY_IMMUTABLE_FIELDS: readonly string[] = [
  'id',
  'actor',
  'actorId',
  'actorKind',
  'action',
  'entity',
  'entityId',
  'kind',
  'changes',
  'createdAt',
  'noteUpdatedAt',
];

/** Какие неизменяемые поля пытались переписать этим телом запроса. */
export function activityImmutableFieldsIn(body: unknown): readonly string[] {
  if (typeof body !== 'object' || body === null) return [];

  const keys = new Set(Object.keys(body));
  return ACTIVITY_IMMUTABLE_FIELDS.filter((field) => keys.has(field));
}

// ---------- Чистка за период ----------

/**
 * Чистка журнала: только период, и обе границы обязательны.
 *
 * 🔴 Ни `id`, ни «удалить всё» здесь нет и не появится (ADR-345): построчное
 * удаление — это способ убрать из журнала одну неудобную строку, а чистка без
 * границ — способ убрать их все. Период называется целиком, и обе его даты
 * человек видит перед нажатием.
 */
export const activityCleanupSchema = z
  .object({
    from: z
      .string({ required_error: 'Укажите начало периода' })
      .refine((value) => parseDayKey(value) !== null, { message: 'Дата в неизвестном формате' }),
    to: z
      .string({ required_error: 'Укажите конец периода' })
      .refine((value) => parseDayKey(value) !== null, { message: 'Дата в неизвестном формате' }),
  })
  .refine((period) => period.from <= period.to, {
    message: 'Начало периода позже его конца',
    path: ['from'],
  });

export type ActivityCleanupInput = z.infer<typeof activityCleanupSchema>;

/**
 * Ключ периода — им подписан след чистки: `2025-01-01..2025-12-31`.
 *
 * 🔴 Стоит в `entityId`, потому что чистка совершается над периодом журнала, а
 * не над записью. Ссылки на строку у неё нет по природе: строки, о которых
 * речь, к моменту записи уже удалены.
 */
export function activityPeriodKey(period: { readonly from: string; readonly to: string }): string {
  return `${period.from}..${period.to}`;
}

/**
 * Период чистки моментами времени. Обе границы обязательны — их требует схема,
 * и тип это повторяет: чистка «от начала времён» и «до сегодня» не бывает.
 */
export function activityCleanupPeriod(period: ActivityCleanupInput): {
  readonly since: Date;
  readonly until: Date;
} {
  return { since: dayStart(period.from), until: dayAfter(period.to) };
}

/**
 * Действия, которые чистка не удаляет никогда.
 *
 * 🔴 След чистки переживает чистку — включая повторную чистку того же периода
 * (issue #822). Держится это условием запроса, а не порядком «сначала удалить,
 * потом записать»: порядок спасает ровно один раз, а вторая чистка за тот же
 * год унесла бы запись о первой, и журнал перестал бы отвечать, кто и когда
 * его чистил. Список закрыт типом: сюда попадает то, без чего журнал перестаёт
 * быть свидетельством о самом себе.
 */
export const ACTIVITY_CLEANUP_TRAIL: readonly ActivityAction[] = ['activity.cleanup'];
