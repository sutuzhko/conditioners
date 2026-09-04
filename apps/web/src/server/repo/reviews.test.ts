// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Подмена объявляется через `vi.hoisted`, чтобы форму строки задавал тест, а
   не генерик Prisma: репозиторий читает отзыв с `select` и отношением
   `rejectedBy`, а выведенный по умолчанию тип делегата этой формы не знает. */
const review = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
  findUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  update: vi.fn<(args?: unknown) => Promise<unknown>>(),
  delete: vi.fn<(args?: unknown) => Promise<unknown>>(),
  count: vi.fn<(args?: unknown) => Promise<number>>(),
}));

vi.mock('@/server/db', () => ({ db: { review } }));

import * as reviews from '@/server/repo/reviews';

const row = {
  id: 'r5',
  name: 'Ирина',
  rating: 5,
  text: 'Приехали в тот же день',
  photo: null,
  avatar: null,
  status: 'PENDING' as const,
  // согласие на обработку ПДн фиксируется при отправке формы (152-ФЗ, инвариант 12)
  consentAt: new Date('2026-08-01T10:00:00Z'),
  rejectReason: null,
  rejectedAt: null,
  rejectedBy: null,
  createdAt: new Date('2026-08-01T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  review.findMany.mockResolvedValue([row]);
  review.findUnique.mockResolvedValue(row);
  review.update.mockResolvedValue({ ...row, status: 'APPROVED' });
  review.count.mockResolvedValue(1);
});

describe('чтение отзывов', () => {
  it('публичные страницы видят только одобренные', async () => {
    await reviews.listApproved();

    expect(review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } }),
    );
  });

  it('админка фильтрует по статусу', async () => {
    await reviews.listByStatus({ status: 'rejected' });

    expect(review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'REJECTED' } }),
    );
  });

  it('без фильтра отдаёт все статусы', async () => {
    await reviews.listByStatus();

    expect(review.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('🔴 список ограничен страницей: архив отзывов только растёт', async () => {
    review.count.mockResolvedValue(20);

    const page = await reviews.listByStatus({ page: 2 });

    expect(review.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 8, take: 8 }));
    expect(page).toMatchObject({ total: 20, page: 2, pages: 3 });
  });

  it('страница за пределами списка прижимается к последней', async () => {
    review.count.mockResolvedValue(9);

    const page = await reviews.listByStatus({ page: 99 });

    expect(page).toMatchObject({ page: 2, pages: 2 });
    expect(review.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 8 }));
  });
});

/** 🔴 Инвариант 7: редактируемый отзыв — не отзыв. */
describe('текст отзыва неизменяем', () => {
  it('модуль не экспортирует ни одной функции правки содержимого', () => {
    expect(Object.keys(reviews).sort()).toEqual([
      'countPending',
      'listApproved',
      'listByStatus',
      'remove',
      'setStatus',
      'toDbStatus',
    ]);
  });

  it('в базу уходит смена статуса и запись отказа — и ничего больше', async () => {
    await reviews.setStatus('r5', { status: 'approved' }, 'u1');

    expect(review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r5' },
        data: {
          status: 'APPROVED',
          rejectReason: null,
          rejectedAt: null,
          rejectedBy: { disconnect: true },
        },
      }),
    );
  });

  it('несуществующий отзыв не обновляется', async () => {
    review.findUnique.mockResolvedValue(null);

    await expect(reviews.setStatus('нет', { status: 'approved' }, 'u1')).rejects.toThrow(
      'Отзыв не найден',
    );
    expect(review.update).not.toHaveBeenCalled();
  });
});

/** 🔴 ADR-300: отказ без записанной причины не проходит дальше репозитория. */
describe('отказ записывается целиком', () => {
  it('причина, момент и модератор уходят в базу вместе со статусом', async () => {
    await reviews.setStatus('r5', { status: 'rejected', reason: 'Реклама конкурента' }, 'u1');

    expect(review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'REJECTED',
          rejectReason: 'Реклама конкурента',
          rejectedAt: expect.any(Date),
          rejectedBy: { connect: { id: 'u1' } },
        },
      }),
    );
  });

  it('отказ из Telegram связывать не с кем, но причина всё равно записана', async () => {
    await reviews.setStatus('r5', { status: 'rejected', reason: 'Нажали кнопку' }, null);

    expect(review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectReason: 'Нажали кнопку',
          rejectedBy: { disconnect: true },
        }),
      }),
    );
  });

  it('🔴 возврат на модерацию гасит причину: иначе она читается как действующая', async () => {
    await reviews.setStatus('r5', { status: 'pending' }, 'u1');

    expect(review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'PENDING',
          rejectReason: null,
          rejectedAt: null,
          rejectedBy: { disconnect: true },
        },
      }),
    );
  });

  it('наружу отказ отдаётся одним блоком с именем модератора', async () => {
    review.update.mockResolvedValue({
      ...row,
      status: 'REJECTED',
      rejectReason: 'Реклама конкурента',
      rejectedAt: new Date('2026-09-04T09:00:00Z'),
      rejectedBy: { name: 'Богдан', login: 'owner' },
    });

    const dto = await reviews.setStatus('r5', { status: 'rejected', reason: 'Реклама' }, 'u1');

    expect(dto.reject).toEqual({
      reason: 'Реклама конкурента',
      by: 'Богдан',
      at: '2026-09-04T09:00:00.000Z',
    });
  });

  it('у отзыва без отказа блока нет вовсе — не половина записи', async () => {
    const [dto] = await reviews.listApproved();

    expect(dto?.reject).toBeNull();
  });
});
