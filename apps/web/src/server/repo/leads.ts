/**
 * Заявки. Внутренний раздел админки: на сайте не показываются нигде.
 *
 * Раздела «Заявки» в исходном дизайне не было — заявки жили только в Telegram
 * (docs/API.md, отличие 3).
 */
import type { LeadStatus, Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import type { LeadUpdate } from '@/entities/lead/model';
import { pageWindow, type Page } from '@/shared/lib/paging';

export type LeadStatusApi = 'new' | 'in_progress' | 'done' | 'rejected';

const TO_DB: Record<LeadStatusApi, LeadStatus> = {
  new: 'NEW',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
  rejected: 'REJECTED',
};

const FROM_DB: Record<LeadStatus, LeadStatusApi> = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  REJECTED: 'rejected',
};

export type LeadDto = {
  id: string;
  name: string;
  phone: string;
  topic: string;
  place: string | null;
  qty: string | null;
  callTime: string | null;
  address: string | null;
  comment: string | null;
  photo: string | null;
  sourceUrl: string | null;
  referrer: string | null;
  utm: Prisma.JsonValue;
  consentAt: string;
  status: LeadStatusApi;
  managerComment: string | null;
  /** Клиент, в которого выросло обращение; `null` — в базу его ещё не завели. */
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadRow = Omit<LeadDto, 'status' | 'consentAt' | 'createdAt' | 'updatedAt'> & {
  status: LeadStatus;
  consentAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(row: LeadRow): LeadDto {
  return {
    ...row,
    status: FROM_DB[row.status],
    consentAt: row.consentAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function whereStatus(status?: LeadStatusApi): Prisma.LeadWhereInput {
  return status === undefined ? {} : { status: TO_DB[status] };
}

/**
 * Страница списка заявок.
 *
 * 🔴 С `take`, а не «все за всё время»: за годы работы список вырастает без
 * потолка, и запрос без границы однажды кладёт панель вместе с базой. Номер
 * страницы приходит из адреса и может указывать за пределы списка — тогда он
 * прижимается к последней существующей (`pageWindow`).
 */
export async function listByStatus(
  params: { status?: LeadStatusApi | undefined; page?: number | undefined } = {},
): Promise<Page<LeadDto>> {
  const where = whereStatus(params.status);
  const total = await db.lead.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  return { items: rows.map(toDto), total, page, pages };
}

/**
 * Сколько заявок в статусе. Сводка панели показывает число новых, и тянуть
 * ради него все записи в память незачем.
 */
export async function countByStatus(status?: LeadStatusApi): Promise<number> {
  return db.lead.count({ where: whereStatus(status) });
}

/**
 * Заявки за промежуток — ими календарь заполняет дни обращений.
 *
 * Отдельно от `listByStatus`: календарю нужен месяц, а не весь список, и
 * тянуть в память все заявки за годы ради одной сетки незачем.
 */
export async function listCreatedBetween(from: Date, to: Date): Promise<LeadDto[]> {
  const rows = await db.lead.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toDto);
}

export async function findById(id: string): Promise<LeadDto | null> {
  const row = await db.lead.findUnique({ where: { id } });
  return row === null ? null : toDto(row);
}

/**
 * Обращения одного клиента — история разговора с человеком в его карточке.
 *
 * Связь берётся по `clientId`, а не подбором по телефону: номер клиента
 * правится, и история, склеенная по совпадению строк, разъехалась бы при
 * первой же правке (ADR-105).
 */
export async function listByClient(clientId: string): Promise<LeadDto[]> {
  const rows = await db.lead.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

/** Менеджер меняет статус и оставляет комментарий; данные клиента не правятся. */
export async function update(id: string, input: LeadUpdate): Promise<LeadDto> {
  const exists = await db.lead.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Заявка не найдена');

  const row = await db.lead.update({
    where: { id },
    data: {
      ...(input.status === undefined ? {} : { status: TO_DB[input.status] }),
      ...(input.managerComment === undefined ? {} : { managerComment: input.managerComment }),
    },
  });

  return toDto(row);
}
