import { z } from 'zod';

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
 */
export const activityEntitySchema = z.enum(['review']);

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
};

/** Как называется сущность в колонке «Над чем». */
export const ACTIVITY_ENTITY_TITLES: Readonly<Record<ActivityEntity, string>> = {
  review: 'Отзыв',
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
