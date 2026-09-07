/**
 * Журнал событий — доступ к данным (ADR-345).
 *
 * 🔴 Правки события здесь нет и не будет: запись создаёт система, а меняется
 * у неё одна пометка человека (фаза 5). Функции, переписывающей автора, время
 * или состав изменений, в этом модуле не должно появиться — по тому же
 * доводу, по которому её нет у отзыва (инвариант 7).
 */
import type {
  ActivityActorKind as ActivityActorKindDb,
  ActivityKind as ActivityKindDb,
  Prisma,
} from '@prisma/client';

import type {
  ActivityAction,
  ActivityActorKind,
  ActivityChanges,
  ActivityEntity,
} from '@/entities/activity/model';
import { db } from '@/server/db';
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
 * события в таблице лежат и читаются фазой 4, где им есть место на экране;
 * тянуть их сюда сейчас значило бы разбирать на каждой странице JSON, который
 * никто не рисует.
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
 * Страница журнала, новые события сверху.
 *
 * 🔴 С `take`, а не «все за всё время»: событие пишется на каждое изменение,
 * это тысячи строк в месяц (PRD), и запрос без границы однажды кладёт панель
 * вместе с базой.
 *
 * Порядок — по времени и по `id`: две записи одной миллисекунды иначе встают
 * в произвольном порядке, и соседние страницы показывают одну и ту же строку
 * дважды. Пара обслуживается индексом `[createdAt, id]` — тем же, которым
 * листается лента уведомлений (ADR-358).
 */
export async function list(
  params: { page?: number | undefined } = {},
): Promise<Page<ActivityEventDto>> {
  const total = await db.activityEvent.count();
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.activityEvent.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    select: ACTIVITY_SELECT,
  });

  return { items: rows.map(toDto), total, page, pages };
}
