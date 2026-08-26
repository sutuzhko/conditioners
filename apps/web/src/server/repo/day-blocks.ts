/**
 * Занятость в календаре: день, в который человека нет.
 *
 * 🔴 Занятость личная. Владелец видит занятость всех — иначе он не поймёт,
 * почему в четверг некого послать; монтажник видит свою. Отбор идёт условием
 * запроса, а не фильтром после выборки: чужая запись не должна доезжать до
 * страницы даже для того, чтобы быть там отброшенной.
 */
import type { BlockRepeat as DbRepeat, Prisma } from '@prisma/client';

import type { DayBlockCreate, DayBlockRepeat, DayBlockUpdate } from '@/entities/crm/model';
import type { AdminRole } from '@/entities/staff/model';
import { type DayKey, dayKeyOf, momentOf } from '@/shared/lib/calendar';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';

const REPEAT_TO_DB: Record<DayBlockRepeat, DbRepeat> = { once: 'ONCE', weekly: 'WEEKLY' };
const REPEAT_FROM_DB: Record<DbRepeat, DayBlockRepeat> = { ONCE: 'once', WEEKLY: 'weekly' };

/** Полночь дня в поясе работ — так занятость и хранится. */
const DAY_START = '00:00';

/** Кто смотрит: от роли зависит, чью занятость видно. */
export type Viewer = { readonly role: AdminRole; readonly userId: string };

export type DayBlockDto = {
  id: string;
  /** Чья занятость: владельцу нужно отличить свой выходной от чужого. */
  userId: string;
  userName: string | null;
  repeat: DayBlockRepeat;
  day: DayKey | null;
  weekday: number | null;
  fromMin: number | null;
  toMin: number | null;
  reason: string | null;
};

type DayBlockRow = {
  id: string;
  userId: string;
  repeat: DbRepeat;
  day: Date | null;
  weekday: number | null;
  fromMin: number | null;
  toMin: number | null;
  reason: string | null;
  user: { name: string | null; login: string };
};

const FIELDS = {
  id: true,
  userId: true,
  repeat: true,
  day: true,
  weekday: true,
  fromMin: true,
  toMin: true,
  reason: true,
  user: { select: { name: true, login: true } },
} as const;

function toDto(row: DayBlockRow): DayBlockDto {
  return {
    id: row.id,
    userId: row.userId,
    /* Логин как запасная подпись: у заведённой второпях учётной записи имени
       может не быть, а «занят: —» ничего не объясняет. */
    userName: row.user.name ?? row.user.login,
    repeat: REPEAT_FROM_DB[row.repeat],
    day: row.day === null ? null : dayKeyOf(row.day),
    weekday: row.weekday,
    fromMin: row.fromMin,
    toMin: row.toMin,
    reason: row.reason,
  };
}

function viewerWhere(viewer: Viewer): Prisma.DayBlockWhereInput {
  return viewer.role === 'installer' ? { userId: viewer.userId } : {};
}

/**
 * Занятость, попадающая в промежуток дат.
 *
 * Повторяемые записи берутся все: постоянный выходной по средам относится к
 * любой неделе, и границами дат его не отобрать. Какие из них лягут на
 * конкретный день, решает разрешение занятости в домене.
 */
export async function listRange(viewer: Viewer, from: Date, to: Date): Promise<DayBlockDto[]> {
  const rows = await db.dayBlock.findMany({
    where: {
      ...viewerWhere(viewer),
      OR: [{ repeat: 'ONCE', day: { gte: from, lt: to } }, { repeat: 'WEEKLY' }],
    },
    orderBy: [{ repeat: 'asc' }, { day: 'asc' }, { weekday: 'asc' }, { fromMin: 'asc' }],
    select: FIELDS,
  });

  return rows.map(toDto);
}

/** Поля записи без владельца: одинаковы и при заведении, и при правке. */
type BlockData = {
  readonly repeat: DbRepeat;
  readonly day: Date | null;
  readonly weekday: number | null;
  readonly fromMin: number | null;
  readonly toMin: number | null;
  readonly reason: string | null;
};

function dataOf(input: DayBlockCreate): BlockData {
  return {
    repeat: REPEAT_TO_DB[input.repeat],
    // разовая держит дату, повторяемая — день недели; схема это уже проверила
    day: input.day === null ? null : momentOf(input.day, DAY_START),
    weekday: input.weekday,
    fromMin: input.fromMin,
    toMin: input.toMin,
    reason: input.reason,
  };
}

/**
 * Занятость заводится только себе.
 *
 * Чужой выходной за человека не проставляют: это его врач и его дела, а
 * владельцу для планирования достаточно видеть чужую занятость, а не заводить
 * её. Поэтому владельца записи задаёт сессия, а не тело запроса — подменить
 * его нечем.
 */
export async function create(viewer: Viewer, input: DayBlockCreate): Promise<DayBlockDto> {
  const row = await db.dayBlock.create({
    data: { ...dataOf(input), userId: viewer.userId },
    select: FIELDS,
  });

  return toDto(row);
}

/**
 * Своя ли это запись. Монтажнику чужая не показывается вовсе — для него её
 * нет; владельцу говорится прямо, что снять её может только хозяин: он эту
 * занятость видит в календаре, и «не найдена» его бы только запутало.
 */
async function assertOwn(viewer: Viewer, id: string): Promise<void> {
  const row = await db.dayBlock.findUnique({ where: { id }, select: { userId: true } });

  if (row === null || (row.userId !== viewer.userId && viewer.role === 'installer')) {
    throw new ApiException('not_found', 'Занятость не найдена');
  }

  if (row.userId !== viewer.userId) {
    throw new ApiException(
      'forbidden',
      'Это занятость другого человека — снять её может только он',
    );
  }
}

/** Правка занятости — целиком: повтор, когда и окно связаны между собой. */
export async function update(
  viewer: Viewer,
  id: string,
  input: DayBlockUpdate,
): Promise<DayBlockDto> {
  await assertOwn(viewer, id);

  const row = await db.dayBlock.update({ where: { id }, data: dataOf(input), select: FIELDS });
  return toDto(row);
}

/** Занятость снимается удалением: закрытый день, который «когда-то был», никому не нужен. */
export async function remove(viewer: Viewer, id: string): Promise<void> {
  await assertOwn(viewer, id);
  await db.dayBlock.delete({ where: { id } });
}
