/**
 * Запись события в журнал (ADR-345).
 *
 * 🔴 Сервис — это одно правило и ни одной строки про HTTP: событие пишется в
 * одной транзакции с самим изменением. Не «после» и не «параллельно»: откат
 * транзакции обязан не оставить ни изменения, ни события, а изменение без
 * следа недопустимо. Инвариант 2 при этом не задет — журнал в той же базе, а
 * не внешний сервис, и `201` заявке по-прежнему не зависит от сети.
 *
 * 🔴 Персональных данных сюда нечем передать, и это устройство, а не
 * договорённость (инвариант 12): подпись берёт сущность и её `id`, а не её
 * содержимое. Имя, телефон и адрес читаются из самой сущности при показе,
 * поэтому удаление клиента по 152-ФЗ убирает его данные и из журнала.
 */
import type {
  ActivityActorKind as ActivityActorKindDb,
  ActivityKind as ActivityKindDb,
  Prisma,
} from '@prisma/client';

import type {
  ActivityAction,
  ActivityChanges,
  ActivityEntity,
  ActivityKind,
} from '@/entities/activity/model';
import * as activity from '@/server/repo/activity';

/**
 * Приведение вида события к перечислению базы.
 *
 * Тип берётся у самого перечисления, а не индексным доступом к полю входа
 * Prisma: у поля стоит умолчание, поэтому во входе оно необязательное, и
 * `['kind']` принесло бы с собой `undefined`.
 */
const KIND_TO_DB: Record<ActivityKind, ActivityKindDb> = {
  regular: 'REGULAR',
  security: 'SECURITY',
};

/**
 * Род автора — производная от самого автора, а не отдельный аргумент.
 *
 * 🔴 В момент записи `actorId = null` не может означать «учётную запись
 * удалили»: удалённой учётной записью не действуют. Значит род выводится
 * здесь однозначно и ошибиться в нём нельзя — параметра, который можно
 * заполнить неверно, у сервиса нет вовсе.
 *
 * Смысл поля именно в этом: оно замораживает факт до того, как учётку удалят.
 * Дальше `user` без автора читается как «удалили», `system` — как «автора не
 * было по природе» (ADR-345, решение о роде автора).
 */
function actorKindOf(actorId: string | null): ActivityActorKindDb {
  return actorId === null ? 'SYSTEM' : 'USER';
}

export type RecordActivityInput = {
  /**
   * Кто. `null` — событие без автора: заявка с сайта или отказ, нажатый
   * кнопкой в Telegram, где нажимает телеграм-аккаунт, а не учётная запись
   * панели (фаза 3).
   */
  readonly actorId: string | null;
  readonly action: ActivityAction;
  readonly entity: ActivityEntity;
  readonly entityId: string;
  /** «Было → стало». Опускается там, где менялись не поля, а сама запись. */
  readonly changes?: ActivityChanges | undefined;
  /** Умолчание — обычное событие: срок хранения 12 месяцев против 36. */
  readonly kind?: ActivityKind | undefined;
};

/**
 * Записать событие.
 *
 * 🔴 Транзакция — обязательный аргумент, а не умолчание `db`. Правило «в
 * одной транзакции с изменением» иначе держалось бы на памяти вызывающего:
 * забытый аргумент молча выносил бы запись наружу транзакции, и изменение
 * оставалось бы в базе без следа — ровно то, ради чего правило и написано.
 * Транзакцию открывает раздел: он знает, что именно меняет.
 *
 * 🔴 `id`, `createdAt` и пометка человека не передаются вовсе. Первые два
 * ставит база и переписать их нечем; пометка — единственное правимое поле
 * записи, и приехавшая вместе с событием она означала бы, что комментарий
 * написала система, а не человек (ADR-345, фаза 5).
 */
export async function recordActivity(
  input: RecordActivityInput,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await activity.create(
    {
      actorId: input.actorId,
      actorKind: actorKindOf(input.actorId),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      kind: KIND_TO_DB[input.kind ?? 'regular'],
      /* Поля нет вовсе, а не `null`: пустой объект в колонке «было → стало»
         читался бы как «менялось, но неизвестно что». */
      ...(input.changes === undefined ? {} : { changes: input.changes }),
    },
    tx,
  );
}
