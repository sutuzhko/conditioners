/**
 * Заявки. Внутренний раздел админки: на сайте не показываются нигде.
 *
 * Раздела «Заявки» в исходном дизайне не было — заявки жили только в Telegram
 * (docs/API.md, отличие 3).
 */
import type { LeadStatus, Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import type { LeadPatchInput } from '@/server/repo/validation';

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

export async function listByStatus(status?: LeadStatusApi): Promise<LeadDto[]> {
  const rows = await db.lead.findMany({
    where: status === undefined ? {} : { status: TO_DB[status] },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

export async function findById(id: string): Promise<LeadDto | null> {
  const row = await db.lead.findUnique({ where: { id } });
  return row === null ? null : toDto(row);
}

/** Менеджер меняет статус и оставляет комментарий; данные клиента не правятся. */
export async function update(id: string, input: LeadPatchInput): Promise<LeadDto> {
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
