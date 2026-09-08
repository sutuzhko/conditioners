/**
 * Журнал событий — доступ к данным (ADR-345).
 *
 * 🔴 Правки события здесь нет и не будет: запись создаёт система, а меняется
 * у неё одна пометка человека — `setNote`. Функции, переписывающей автора,
 * время или состав изменений, в этом модуле не должно появиться — по тому же
 * доводу, по которому её нет у отзыва (инвариант 7).
 *
 * 🔴 Удаление здесь одно — `removeBetween`, чистка за период, и обе границы у
 * неё обязательны (ADR-345, issue #821). Построчного удаления нет ни в
 * модуле, ни в API: возможность убрать из журнала одну неудобную строку
 * обесценивает весь журнал. Закрытый список экспортов держит проверка рядом.
 */
import type {
  ActivityActorKind as ActivityActorKindDb,
  ActivityKind as ActivityKindDb,
  Prisma,
} from '@prisma/client';

import {
  activityActionsOfSection,
  activityPeriod,
  ACTIVITY_CLEANUP_TRAIL,
  EMPTY_ACTIVITY_FILTER,
  type ActivityAction,
  type ActivityActorKind,
  type ActivityChanges,
  type ActivityEntity,
  type ActivityFilter,
} from '@/entities/activity/model';
import type { AdminRole } from '@/entities/staff/model';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { roleToDb } from '@/server/repo/roles';
import { pageWindow, type Page } from '@/shared/lib/paging';

const ACTOR_KIND_FROM_DB: Record<ActivityActorKindDb, ActivityActorKind> = {
  USER: 'user',
  SYSTEM: 'system',
};

/** Автор события: имя, а логин — только если имени нет, как у отказа отзыва. */
export type ActivityActor = {
  readonly id: string;
  readonly name: string;
};

/**
 * Строка журнала для списка.
 *
 * 🔴 Ровно то, что список показывает, и ни поля сверх. Состав изменений и вид
 * события в таблице лежат, но наружу не идут: рисовать «было → стало» в
 * колонке пока негде, а разбирать ради этого JSON на каждой строке страницы
 * незачем. Пометка человека — идёт: она и пишется ради того, чтобы её читали
 * в списке (ADR-345, фаза 5).
 *
 * `action` и `entity` остаются строками, а не объединениями: в базе они
 * строки, и старое действие, переименованное следующей фазой, обязано
 * показаться как есть, а не уронить страницу разбором. Подписи ищет
 * `activityActionTitle` — он же и отвечает за незнакомый ключ.
 */
export type ActivityEventDto = {
  readonly id: string;
  /**
   * Кто. `null` — либо автора не было вовсе, либо учётную запись удалили:
   * строка «менеджер снял отзыв» переживает увольнение (`SetNull` в схеме).
   * Что именно из двух — отвечает `actorKind`.
   */
  readonly actor: ActivityActor | null;
  /**
   * Род автора, снятый в момент записи.
   *
   * 🔴 `user` без `actor` читается как «учётную запись удалили», `system` — как
   * «автора не было по природе». Без этого поля оба случая — просто `null`.
   */
  readonly actorKind: ActivityActorKind;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string;
  /**
   * Пометка человека — единственное правимое поле записи (ADR-345, фаза 5).
   * `null` — не комментировали.
   */
  readonly note: string | null;
  /** Когда пометку правили последний раз. `null` вместе с пустой пометкой. */
  readonly noteUpdatedAt: string | null;
  readonly createdAt: string;
};

/**
 * Что читаем у события. Автора — отношением и только именем с логином: в
 * панель не должны просачиваться ни хеш пароля, ни ИНН (PROJECT §5.5).
 */
const ACTIVITY_SELECT = {
  id: true,
  actorId: true,
  actorKind: true,
  actor: { select: { name: true, login: true } },
  action: true,
  entity: true,
  entityId: true,
  note: true,
  noteUpdatedAt: true,
  createdAt: true,
} as const satisfies Prisma.ActivityEventSelect;

type ActivityRow = {
  id: string;
  actorId: string | null;
  actorKind: ActivityActorKindDb;
  actor: { name: string | null; login: string } | null;
  action: string;
  entity: string;
  entityId: string;
  note: string | null;
  noteUpdatedAt: Date | null;
  createdAt: Date;
};

function toDto(row: ActivityRow): ActivityEventDto {
  return {
    id: row.id,
    actor:
      row.actorId === null || row.actor === null
        ? null
        : /* Имя, а логин — только если имени нет: у заведённой на скорую руку
             учётки бывает лишь он, и он лучше пустоты (так же у отказа отзыва). */
          { id: row.actorId, name: row.actor.name ?? row.actor.login },
    actorKind: ACTOR_KIND_FROM_DB[row.actorKind],
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    note: row.note,
    noteUpdatedAt: row.noteUpdatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Что кладётся в таблицу. `id` и `createdAt` не перечислены — их ставит база. */
export type ActivityEventData = {
  readonly actorId: string | null;
  readonly action: ActivityAction;
  readonly entity: ActivityEntity;
  readonly entityId: string;
  readonly actorKind: ActivityActorKindDb;
  readonly kind: ActivityKindDb;
  /* Без `| undefined`, в отличие от входа сервиса: под
     `exactOptionalPropertyTypes` явное `undefined` в необязательное поле
     Prisma не проходит, а «поля нет вовсе» — проходит. Сервис и складывает
     его условным разворотом, а не значением `undefined`. */
  readonly changes?: ActivityChanges;
};

/**
 * Вставка события.
 *
 * 🔴 Клиент передаётся всегда и по умолчанию не подставляется: событие пишется
 * в одной транзакции с самим изменением (ADR-345), и умолчание `db` означало
 * бы, что забытый аргумент молча выносит запись наружу транзакции — то есть
 * ровно ту ошибку, ради которой правило и написано.
 */
export async function create(
  data: ActivityEventData,
  client: Prisma.TransactionClient,
): Promise<void> {
  await client.activityEvent.create({ data, select: { id: true } });
}

/**
 * Условия отбора в терминах базы.
 *
 * 🔴 Собраны в одном месте и списком, а не по ветке на вызов: список и счётчик
 * страниц обязаны отбирать одно и то же. Разойдясь, они дают «страница 3 из 7»
 * над пустой таблицей — то есть разбивку, которая ведёт в никуда.
 */
function whereOf(
  filter: ActivityFilter,
  /**
   * Учётные записи, попавшие под отбор по роли. `null` — роль не выбрана.
   * Пустой массив — роли не нашлось ни у кого, и это законный ответ «ничего»,
   * а не «условия нет».
   */
  roleActors: readonly string[] | null,
): Prisma.ActivityEventWhereInput {
  const { since, until } = activityPeriod(filter);

  return {
    ...actorWhere(filter.actor, roleActors),
    ...(filter.section === undefined
      ? {}
      : { action: { in: [...activityActionsOfSection(filter.section)] } }),
    ...(filter.entity === undefined ? {} : { entity: filter.entity }),
    ...(since === undefined && until === undefined
      ? {}
      : {
          createdAt: {
            ...(since === undefined ? {} : { gte: since }),
            /* Верхняя граница исключающая: `until` — это московская полночь
               следующих суток, и `lte` потеряло бы события последней
               миллисекунды дня. */
            ...(until === undefined ? {} : { lt: until }),
          },
        }),
  };
}

/**
 * Условие по автору: выбранный человек, выбранная роль или оба сразу.
 *
 * 🔴 Роль приходит уже развёрнутой в перечень учётных записей — `actorId IN
 * (…)`, а не связанный фильтр `actor: { role }`. Связанный фильтр уводит
 * запрос в чужую таблицу, и отбор перестаёт ложиться на индекс самого
 * журнала: `[actorId, createdAt]` для него не подходит. Пока роль действовала
 * часто, это незаметно; на «что делал монтажник за прошлый год» планировщик
 * идёт по времени сверху вниз и ищет автора у каждой строки — и так дважды,
 * потому что рядом с выборкой считается ещё и `count` для разбивки, а он
 * обходит весь отобранный диапазон целиком, а не восемь строк.
 *
 * Перечень при этом крошечный и ограничен числом учётных записей панели.
 *
 * Человек и роль вместе — пересечение, а не «победит последнее»: выбрать
 * Ирину и роль монтажника значит спросить «события Ирины, если она монтажник»,
 * и честный ответ на это — пусто, а не все события Ирины.
 */
function actorWhere(
  actor: string,
  roleActors: readonly string[] | null,
): Prisma.ActivityEventWhereInput {
  if (roleActors === null) return actor === '' ? {} : { actorId: actor };

  const chosen = actor === '' ? roleActors : roleActors.filter((id) => id === actor);
  return { actorId: { in: [...chosen] } };
}

/**
 * Учётные записи, которые **сейчас** числятся в этой роли.
 *
 * 🔴 Именно сейчас, а не на момент действия: своей копии роли у события нет
 * (см. `ActivityFilter`). Отбор отвечает на вопрос ровно так, как он звучит в
 * панели: «менеджеры» — это те, кто числится менеджером сегодня.
 *
 * Читается здесь, а не в `repo/admin-users`: журнал спрашивает не «кто есть
 * кто», а «чьи события показать», и ответ ему нужен одним столбцом
 * идентификаторов — ровно тем, что ляжет в условие `actorId IN (…)`. Запрос
 * обслуживает индекс `[role, active]` на `AdminUser`.
 */
async function actorsWithRole(role: AdminRole): Promise<readonly string[]> {
  const rows = await db.adminUser.findMany({
    where: { role: roleToDb(role) },
    select: { id: true },
  });

  return rows.map((row) => row.id);
}

/**
 * Страница журнала, новые события сверху.
 *
 * 🔴 Другого способа прочитать журнал у панели нет, и это главное свойство
 * функции (issue #816). Границы окна ставит `pageWindow`, а не вызывающий:
 * параметра «сколько» здесь не существует, поэтому «отдай всё» нельзя ни
 * попросить, ни забыть ограничить. Событие пишется на каждое изменение — это
 * тысячи строк в месяц (PRD), и один запрос без границы кладёт панель вместе
 * с базой.
 *
 * Порядок — по времени и по `id`: две записи одной миллисекунды иначе встают
 * в произвольном порядке, и соседние страницы показывают одну и ту же строку
 * дважды. Пара обслуживается индексом `[createdAt, id]` — тем же, которым
 * листается лента уведомлений (ADR-358).
 */
export async function list(
  params: { page?: number | undefined; filter?: ActivityFilter | undefined } = {},
): Promise<Page<ActivityEventDto>> {
  const filter = params.filter ?? EMPTY_ACTIVITY_FILTER;
  const where = whereOf(
    filter,
    filter.role === undefined ? null : await actorsWithRole(filter.role),
  );

  const total = await db.activityEvent.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.activityEvent.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    select: ACTIVITY_SELECT,
  });

  return { items: rows.map(toDto), total, page, pages };
}

/**
 * Пометка человека у записи — **единственная** правка, которую знает журнал
 * (ADR-345, инвариант 7).
 *
 * 🔴 Аргументов ровно два, и второй — текст пометки. Автора, время и состав
 * изменений сюда нечем передать: функции, которая их принимает, в модуле нет,
 * поэтому «переписать событие» — не запрещённая операция, а несуществующая.
 * Тот же довод, по которому у отзыва нет правки текста.
 *
 * Пустая пометка стирается вместе с меткой времени: `noteUpdatedAt` отвечает
 * на вопрос «когда комментировали», и у записи без комментария ответа нет.
 */
export async function setNote(id: string, note: string): Promise<ActivityEventDto> {
  const text = note.trim();

  /* 🔴 Проверка и запись — одной транзакцией. Между ними в журнал ходит
     чистка за период, и запись, существовавшая при `findUnique`, к моменту
     `update` может быть уже унесена: Prisma бросит `P2025`, и человек получит
     «что-то пошло не так» вместо «запись не найдена». */
  return db.$transaction(async (tx) => {
    const exists = await tx.activityEvent.findUnique({ where: { id }, select: { id: true } });
    if (exists === null) throw new ApiException('not_found', 'Запись журнала не найдена', 'id');

    const row = await tx.activityEvent.update({
      where: { id },
      data:
        text === ''
          ? { note: null, noteUpdatedAt: null }
          : { note: text, noteUpdatedAt: new Date() },
      select: ACTIVITY_SELECT,
    });

    return toDto(row);
  });
}

/**
 * Чистка журнала за период.
 *
 * 🔴 Границы обязательны обе, и это подпись функции, а не проверка внутри:
 * «удалить всё» здесь нельзя даже случайно. Построчного удаления нет вовсе —
 * ни здесь, ни в API (ADR-345): убрать из журнала одну неудобную строку не
 * должно быть возможно никаким сочетанием аргументов.
 *
 * 🔴 След чистки исключается **условием запроса**, а не порядком вызовов.
 * Порядок «сначала удалить, потом записать» защищает ровно один раз: вторая
 * чистка того же периода унесла бы след первой, и журнал перестал бы отвечать,
 * кто и когда его чистил. Условие держится при любом числе повторов и при
 * любом периоде — включая сегодняшний, внутрь которого попадает сама запись о
 * чистке.
 */
export async function removeBetween(
  period: { readonly since: Date; readonly until: Date },
  client: Prisma.TransactionClient = db,
): Promise<number> {
  const { count } = await client.activityEvent.deleteMany({
    where: {
      createdAt: { gte: period.since, lt: period.until },
      /* 🔴 События безопасности ручная чистка не уносит. Срок хранения у них
         втрое длиннее не по случайности (36 месяцев против 12, ADR-345), и
         кнопка в панели не должна быть сильнее того, что решено про хранение:
         журнал, из которого владелец убирает отказы входа и смены ролей,
         перестаёт защищать в ту сторону, ради которой заведён. */
      kind: { not: 'SECURITY' },
      /* Отдельно от вида — сам след чистки. Условие выглядит лишним, пока след
         записан видом «безопасность», и перестаёт быть лишним в тот день,
         когда вид у него поменяют: выживание следа не должно зависеть от
         чужого решения о сроках хранения (issue #822). */
      action: { notIn: [...ACTIVITY_CLEANUP_TRAIL] },
    },
  });

  return count;
}
