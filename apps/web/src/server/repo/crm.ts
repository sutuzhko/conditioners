/**
 * Календарь работ. Раздел только для панели: наружу он не отдаётся нигде —
 * это внутренний график владельца с телефонами и адресами клиентов.
 */
import type { CrmEventKind as DbKind, CrmEventStatus as DbStatus } from '@prisma/client';

import type {
  CrmEventCreate,
  CrmEventKind,
  CrmEventStatus,
  CrmEventUpdate,
} from '@/entities/crm/model';
import { momentOf } from '@/shared/lib/calendar';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';

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
  clientName: true,
  clientPhone: true,
  address: true,
  note: true,
  leadId: true,
} as const;

/** Дела за промежуток — им заполняется сетка месяца. */
export async function listRange(from: Date, to: Date): Promise<CrmEventDto[]> {
  const rows = await db.crmEvent.findMany({
    where: { at: { gte: from, lt: to } },
    orderBy: { at: 'asc' },
    select: FIELDS,
  });
  return rows.map(toDto);
}

/**
 * Ближайшие незакрытые дела — список рядом с календарём и на главной панели.
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

/** Сколько дел просрочено — цифра рядом с заголовком, чтобы её нельзя было не заметить. */
export async function countOverdue(before: Date): Promise<number> {
  return db.crmEvent.count({ where: { status: 'PLANNED', at: { lt: before } } });
}

export async function create(input: CrmEventCreate): Promise<CrmEventDto> {
  const row = await db.crmEvent.create({
    data: {
      kind: KIND_TO_DB[input.kind],
      at: momentOf(input.day, input.time),
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

  const row = await db.crmEvent.update({
    where: { id },
    data: {
      ...(input.kind === undefined ? {} : { kind: KIND_TO_DB[input.kind] }),
      ...(input.status === undefined ? {} : { status: STATUS_TO_DB[input.status] }),
      // дата и время переносятся только вместе — схема это уже проверила
      ...(input.day === undefined || input.time === undefined
        ? {}
        : { at: momentOf(input.day, input.time) }),
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
