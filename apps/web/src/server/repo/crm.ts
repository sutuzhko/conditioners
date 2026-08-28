/**
 * Календарь работ. Раздел только для панели: наружу он не отдаётся нигде —
 * это внутренний график владельца с телефонами и адресами клиентов.
 */
import type {
  CrmEventKind as DbKind,
  CrmEventStatus as DbStatus,
  OrderStatus as DbOrderStatus,
  OrderType as DbOrderType,
} from '@prisma/client';

import type {
  CrmEventCreate,
  CrmEventKind,
  CrmEventStatus,
  CrmEventUpdate,
} from '@/entities/crm/model';
import { overtimeMinutes } from '@/entities/crm/lib/overtime';
import type { OrderStatus, OrderType } from '@/entities/order/model';
import { momentOf } from '@/shared/lib/calendar';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import type { Viewer } from '@/server/repo/day-blocks';
import { workWindow } from '@/server/repo/settings';

const ORDER_TYPE_FROM_DB: Record<DbOrderType, OrderType> = {
  INSTALL: 'install',
  SERVICE: 'service',
  REPAIR: 'repair',
};

const ORDER_STATUS_FROM_DB: Record<DbOrderStatus, OrderStatus> = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

const KIND_TO_DB: Record<CrmEventKind, DbKind> = {
  call: 'CALL',
  measure: 'MEASURE',
  install: 'INSTALL',
  service: 'SERVICE',
  meeting: 'MEETING',
  note: 'NOTE',
};

const KIND_FROM_DB: Record<DbKind, CrmEventKind> = {
  CALL: 'call',
  MEASURE: 'measure',
  INSTALL: 'install',
  SERVICE: 'service',
  MEETING: 'meeting',
  NOTE: 'note',
};

const STATUS_TO_DB: Record<CrmEventStatus, DbStatus> = {
  planned: 'PLANNED',
  done: 'DONE',
  cancelled: 'CANCELLED',
};

const STATUS_FROM_DB: Record<DbStatus, CrmEventStatus> = {
  PLANNED: 'planned',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

export type CrmEventDto = {
  id: string;
  kind: CrmEventKind;
  status: CrmEventStatus;
  /** ISO. День и время вычисляются при показе — в поясе работ, а не браузера. */
  at: string;
  durationMin: number;
  /** Минуты за рабочим окном на момент записи. Только на чтение (ADR-138). */
  overtimeMin: number;
  clientName: string;
  clientPhone: string | null;
  address: string | null;
  note: string | null;
  leadId: string | null;
};

type CrmEventRow = {
  id: string;
  kind: DbKind;
  status: DbStatus;
  at: Date;
  durationMin: number;
  overtimeMin: number;
  clientName: string;
  clientPhone: string | null;
  address: string | null;
  note: string | null;
  leadId: string | null;
};

function toDto(row: CrmEventRow): CrmEventDto {
  return {
    id: row.id,
    kind: KIND_FROM_DB[row.kind],
    status: STATUS_FROM_DB[row.status],
    at: row.at.toISOString(),
    durationMin: row.durationMin,
    overtimeMin: row.overtimeMin,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    address: row.address,
    note: row.note,
    leadId: row.leadId,
  };
}

const FIELDS = {
  id: true,
  kind: true,
  status: true,
  at: true,
  durationMin: true,
  overtimeMin: true,
  clientName: true,
  clientPhone: true,
  address: true,
  note: true,
  leadId: true,
} as const;

/**
 * Пересчёт переработки при переносе. Недостающую половину вводных берём из
 * самой записи: перенесли время, не тронув длительность, — длительность
 * осталась прежней, и наоборот.
 */
async function recomputeOvertime(
  id: string,
  at: Date | null,
  durationMin: number | undefined,
): Promise<number | null> {
  const current = await db.crmEvent.findUnique({
    where: { id },
    select: { at: true, durationMin: true },
  });
  if (current === null) return null;

  return overtimeMinutes(at ?? current.at, durationMin ?? current.durationMin, await workWindow());
}

/**
 * Дела за промежуток — ими заполняется сетка календаря.
 *
 * 🔴 Дело — раздел владельца: у `CrmEvent` исполнителя нет, это график самого
 * владельца с именами, телефонами и адресами клиентов, а монтажнику клиенты и
 * обращения закрыты целиком (CRM.md §6). Поэтому у монтажника выборка не
 * фильтруется, а не выполняется вовсе: чужое дело не должно покидать базу
 * даже для того, чтобы быть там отброшенным (ADR-114).
 */
export async function listRange(viewer: Viewer, from: Date, to: Date): Promise<CrmEventDto[]> {
  if (viewer.role === 'installer') return [];

  const rows = await db.crmEvent.findMany({
    where: { at: { gte: from, lt: to } },
    orderBy: { at: 'asc' },
    select: FIELDS,
  });
  return rows.map(toDto);
}

/**
 * Ближайшие незакрытые дела — список на главной панели.
 *
 * 🔴 Как и `listRange`, это данные владельца: сводка вызывает её из раздела,
 * закрытого `requireOwnerPage`. Появится второй вызывающий — он обязан
 * проверить роль до вызова или получить `Viewer`, как соседи по файлу.
 *
 * Просроченные попадают сюда наравне с будущими: дело, до которого не дошли
 * руки, обязано мозолить глаза, а не исчезать вместе со вчерашним днём.
 * Поэтому отсчёт идёт не от «сейчас», а от переданной границы — обычно это
 * начало месяца или начало сегодняшнего дня.
 */
export async function listUpcoming(from: Date, limit: number): Promise<CrmEventDto[]> {
  const rows = await db.crmEvent.findMany({
    where: { status: 'PLANNED', at: { gte: from } },
    orderBy: { at: 'asc' },
    take: limit,
    select: FIELDS,
  });
  return rows.map(toDto);
}

/**
 * Сколько дел просрочено — цифра рядом с заголовком, чтобы её нельзя было не
 * заметить. У монтажника дел нет вовсе, поэтому и просрочки нет: счётчик
 * чужих незакрытых дел — та же закрытая от него сводка, только числом.
 */
export async function countOverdue(viewer: Viewer, before: Date): Promise<number> {
  if (viewer.role === 'installer') return 0;

  return db.crmEvent.count({ where: { status: 'PLANNED', at: { lt: before } } });
}

export async function create(input: CrmEventCreate): Promise<CrmEventDto> {
  const at = momentOf(input.day, input.time);

  const row = await db.crmEvent.create({
    data: {
      kind: KIND_TO_DB[input.kind],
      at,
      durationMin: input.durationMin,
      /* Считаем при записи и храним числом: окно в настройках владелец
         меняет, а переработка прошлого четверга измениться не имеет права
         — на неё смотрят при расчётах с людьми (ADR-138). */
      overtimeMin: overtimeMinutes(at, input.durationMin, await workWindow()),
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      address: input.address,
      note: input.note,
      leadId: input.leadId,
    },
    select: FIELDS,
  });
  return toDto(row);
}

export async function update(id: string, input: CrmEventUpdate): Promise<CrmEventDto> {
  const exists = await db.crmEvent.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Дело не найдено');

  /* Переработка пересчитывается, только когда двинулось время или
     длительность: правка телефона клиента к ней отношения не имеет. */
  const moved =
    (input.day !== undefined && input.time !== undefined) || input.durationMin !== undefined;
  const at =
    input.day === undefined || input.time === undefined ? null : momentOf(input.day, input.time);
  const recomputed = moved ? await recomputeOvertime(id, at, input.durationMin) : null;

  const row = await db.crmEvent.update({
    where: { id },
    data: {
      ...(input.kind === undefined ? {} : { kind: KIND_TO_DB[input.kind] }),
      ...(input.status === undefined ? {} : { status: STATUS_TO_DB[input.status] }),
      // дата и время переносятся только вместе — схема это уже проверила
      ...(at === null ? {} : { at }),
      ...(input.durationMin === undefined ? {} : { durationMin: input.durationMin }),
      ...(recomputed === null ? {} : { overtimeMin: recomputed }),
      ...(input.clientName === undefined ? {} : { clientName: input.clientName }),
      ...(input.clientPhone === undefined ? {} : { clientPhone: input.clientPhone }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.leadId === undefined ? {} : { leadId: input.leadId }),
    },
    select: FIELDS,
  });

  return toDto(row);
}

/**
 * Удаление, а не «архив»: отменённое дело закрывается статусом, а удаляют
 * только ошибочно заведённое — такому в истории не место.
 */
export async function remove(id: string): Promise<void> {
  const exists = await db.crmEvent.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Дело не найдено');

  await db.crmEvent.delete({ where: { id } });
}

// ---------- Наряды в календаре ----------

/**
 * Наряд в сетке календаря — CRM.md §3.5.
 *
 * 🔴 Денег здесь нет вовсе: ни суммы, ни выплаты, ни удержания. Календарь
 * отвечает на вопрос «кто куда и когда едет», и проекция под роль ему не
 * нужна — закрытых полей просто не выбирается из базы. Карточка наряда со
 * всеми деньгами живёт в своём разделе и там же проверяет доступ (ADR-114).
 */
export type CalendarOrderDto = {
  id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  /** ISO. День и время вычисляются при показе — в поясе работ, а не браузера. */
  at: string;
  durationMin: number;
  address: string;
  clientName: string;
  installerId: string | null;
  installerName: string | null;
};

const ORDER_FIELDS = {
  id: true,
  number: true,
  type: true,
  status: true,
  at: true,
  durationMin: true,
  address: true,
  client: { select: { name: true } },
  installerId: true,
  installer: { select: { name: true, login: true } },
} as const;

/**
 * Наряды, попадающие в сетку календаря.
 *
 * 🔴 Монтажник видит только назначенные ему — условием запроса, а не фильтром
 * после выборки: чужой выезд не должен доезжать до страницы даже для того,
 * чтобы быть там отброшенным (ADR-114).
 *
 * Отказы в календарь не попадают: отменённый выезд не занимает ни день, ни
 * человека, а место в плотной сетке занимал бы.
 */
export async function listOrdersRange(
  viewer: Viewer,
  from: Date,
  to: Date,
): Promise<CalendarOrderDto[]> {
  const rows = await db.order.findMany({
    where: {
      ...(viewer.role === 'installer' ? { installerId: viewer.userId } : {}),
      status: { not: 'CANCELLED' },
      at: { gte: from, lt: to },
    },
    orderBy: { at: 'asc' },
    select: ORDER_FIELDS,
  });

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    type: ORDER_TYPE_FROM_DB[row.type],
    status: ORDER_STATUS_FROM_DB[row.status],
    at: row.at.toISOString(),
    durationMin: row.durationMin,
    address: row.address,
    clientName: row.client.name,
    installerId: row.installerId,
    /* Логин как запасная подпись: у заведённой второпях учётной записи имени
       может не быть, а колонка без подписи в виде «по монтажникам» бесполезна. */
    installerName: row.installer === null ? null : (row.installer.name ?? row.installer.login),
  }));
}
