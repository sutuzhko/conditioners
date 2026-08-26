/**
 * Отзывы.
 *
 * 🔴 Инвариант 7: текст отзыва неизменяем. В этом модуле сознательно нет и не
 * должно появиться функции, меняющей `text`, `name`, `rating` или `photo`:
 * модератор управляет только статусом. Редактируемый отзыв — не отзыв.
 */
import type { Prisma, ReviewStatus } from '@prisma/client';
import { db } from '@/server/db';
import { ApiException } from '@/server/http';
import { pageWindow, type Page } from '@/shared/lib/paging';

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
  rating: number;
  text: string;
  /** Фотография места установки. */
  photo: string | null;
  /** Фотография автора отзыва. */
  avatar: string | null;
  status: ReviewStatusApi;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  text: string;
  photo: string | null;
  avatar: string | null;
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

/**
 * Страница списка отзывов.
 *
 * 🔴 С `take`, а не «все за всё время»: отклонённые и архивные не удаляются
 * (инвариант 7), список только растёт, и запрос без границы однажды кладёт
 * панель вместе с базой.
 */
export async function listByStatus(
  params: { status?: ReviewStatusApi | undefined; page?: number | undefined } = {},
): Promise<Page<ReviewDto>> {
  const where: Prisma.ReviewWhereInput =
    params.status === undefined ? {} : { status: TO_DB[params.status] };

  const total = await db.review.count({ where });
  const { page, pages, skip, take } = pageWindow(total, params.page ?? 1);

  const rows = await db.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  return { items: rows.map(toDto), total, page, pages };
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

/** Пути снимков возвращаются наружу: файлы чистит маршрут, как у моделей и статей. */
export async function remove(id: string): Promise<{ photo: string | null; avatar: string | null }> {
  const exists = await db.review.findUnique({
    where: { id },
    select: { id: true, photo: true, avatar: true },
  });
  if (exists === null) throw new ApiException('not_found', 'Отзыв не найден');
  await db.review.delete({ where: { id } });
  return { photo: exists.photo, avatar: exists.avatar };
}
