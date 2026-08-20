/**
 * Отзывы.
 *
 * 🔴 Инвариант 7: текст отзыва неизменяем. В этом модуле сознательно нет и не
 * должно появиться функции, меняющей `text`, `name`, `rating` или `photo`:
 * модератор управляет только статусом. Редактируемый отзыв — не отзыв.
 */
import type { ReviewStatus } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';

export type ReviewStatusApi = 'pending' | 'approved' | 'rejected' | 'archived';

const TO_DB: Record<ReviewStatusApi, ReviewStatus> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  archived: 'ARCHIVED',
};

const FROM_DB: Record<ReviewStatus, ReviewStatusApi> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
};

export function toDbStatus(status: ReviewStatusApi): ReviewStatus {
  return TO_DB[status];
}

export type ReviewDto = {
  id: string;
  name: string;
  district: string | null;
  rating: number;
  text: string;
  photo: string | null;
  status: ReviewStatusApi;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  name: string;
  district: string | null;
  rating: number;
  text: string;
  photo: string | null;
  status: ReviewStatus;
  createdAt: Date;
};

function toDto(row: ReviewRow): ReviewDto {
  return { ...row, status: FROM_DB[row.status], createdAt: row.createdAt.toISOString() };
}

/** Публичные страницы видят только одобренное. */
export async function listApproved(): Promise<ReviewDto[]> {
  const rows = await db.review.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

export async function listByStatus(status?: ReviewStatusApi): Promise<ReviewDto[]> {
  const rows = await db.review.findMany({
    where: status === undefined ? {} : { status: TO_DB[status] },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

export async function countPending(): Promise<number> {
  return db.review.count({ where: { status: 'PENDING' } });
}

/** Единственная операция модератора над отзывом. */
export async function setStatus(id: string, status: ReviewStatusApi): Promise<ReviewDto> {
  const exists = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Отзыв не найден');

  const row = await db.review.update({ where: { id }, data: { status: TO_DB[status] } });
  return toDto(row);
}

export async function remove(id: string): Promise<void> {
  const exists = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Отзыв не найден');
  await db.review.delete({ where: { id } });
}
