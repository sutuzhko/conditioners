/**
 * Отзывы.
 *
 * 🔴 Инвариант 7: текст отзыва неизменяем. В этом модуле сознательно нет и не
 * должно появиться функции, меняющей `text`, `name`, `rating` или `photo`:
 * модератор управляет только статусом. Редактируемый отзыв — не отзыв.
 */
import type { Prisma, ReviewStatus } from '@prisma/client';
import type { ReviewModeration } from '@/entities/review/model';
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
  /** Причина отказа и кто его вынес — у отзывов, которых не отклоняли, `null`. */
  reject: ReviewReject | null;
  createdAt: string;
};

/** Отказ как одно целое: причина без автора и даты читается наполовину. */
export type ReviewReject = {
  reason: string;
  /** Имя модератора; `null` — учётную запись удалили, причина осталась. */
  by: string | null;
  at: string;
};

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  text: string;
  photo: string | null;
  avatar: string | null;
  status: ReviewStatus;
  rejectReason: string | null;
  rejectedAt: Date | null;
  rejectedBy: { name: string | null; login: string } | null;
  createdAt: Date;
};

/**
 * Отзыв наружу.
 *
 * 🔴 Поля отказа собираются в одно или не отдаются вовсе: причина без даты
 * или дата без причины — половина записи, и панели пришлось бы гадать, что
 * из этого показывать.
 */
function toDto({ rejectReason, rejectedAt, rejectedBy, ...row }: ReviewRow): ReviewDto {
  const reject: ReviewReject | null =
    rejectReason === null || rejectedAt === null
      ? null
      : {
          reason: rejectReason,
          /* Имя, а логин — только если имени нет: в панели у монтажников имя
             есть всегда, а у заведённой на скорую руку учётки бывает лишь
             логин, и он лучше пустоты. */
          by: rejectedBy === null ? null : (rejectedBy.name ?? rejectedBy.login),
          at: rejectedAt.toISOString(),
        };

  return { ...row, status: FROM_DB[row.status], reject, createdAt: row.createdAt.toISOString() };
}

/**
 * Что читаем у отзыва. Модератора берём отношением — но только имя и логин:
 * в панель не должны просачиваться ни хеш пароля, ни ИНН (PROJECT §5.5).
 */
const REVIEW_SELECT = {
  id: true,
  name: true,
  rating: true,
  text: true,
  photo: true,
  avatar: true,
  status: true,
  rejectReason: true,
  rejectedAt: true,
  rejectedBy: { select: { name: true, login: true } },
  createdAt: true,
} as const satisfies Prisma.ReviewSelect;

/** Публичные страницы видят только одобренное. */
export async function listApproved(): Promise<ReviewDto[]> {
  const rows = await db.review.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: REVIEW_SELECT,
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
    select: REVIEW_SELECT,
  });

  return { items: rows.map(toDto), total, page, pages };
}

export async function countPending(): Promise<number> {
  return db.review.count({ where: { status: 'PENDING' } });
}

/**
 * Единственная операция модератора над отзывом.
 *
 * 🔴 Отказ записывается целиком — причина, кто и когда (ADR-300), — а любой
 * другой переход поля отказа гасит. Причина, пережившая возврат на модерацию,
 * читалась бы как действующая: отзыв опубликован, а под ним объяснение, за
 * что его отклонили.
 */
export async function setStatus(
  id: string,
  moderation: ReviewModeration,
  /* `null` — отклонили кнопкой в Telegram: там нажимает телеграм-аккаунт, а
     не учётная запись панели, и связывать отказ не с кем. Кто нажал, остаётся
     в самой причине — её складывает канал. */
  moderatorId: string | null,
): Promise<ReviewDto> {
  const exists = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (exists === null) throw new ApiException('not_found', 'Отзыв не найден');

  const reject: Prisma.ReviewUpdateInput =
    moderation.status === 'rejected'
      ? {
          rejectReason: moderation.reason,
          rejectedAt: new Date(),
          rejectedBy:
            moderatorId === null ? { disconnect: true } : { connect: { id: moderatorId } },
        }
      : { rejectReason: null, rejectedAt: null, rejectedBy: { disconnect: true } };

  const row = await db.review.update({
    where: { id },
    data: { status: TO_DB[moderation.status], ...reject },
    select: REVIEW_SELECT,
  });
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
