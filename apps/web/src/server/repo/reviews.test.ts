// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({
  db: {
    review: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from '@/server/db';
import * as reviews from '@/server/repo/reviews';

const row = {
  id: 'r5',
  name: 'Ирина',
  rating: 5,
  text: 'Приехали в тот же день',
  photo: null,
  status: 'PENDING' as const,
  // согласие на обработку ПДн фиксируется при отправке формы (152-ФЗ, инвариант 12)
  consentAt: new Date('2026-08-01T10:00:00Z'),
  createdAt: new Date('2026-08-01T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.review.findMany).mockResolvedValue([row]);
  vi.mocked(db.review.findUnique).mockResolvedValue(row);
  vi.mocked(db.review.update).mockResolvedValue({ ...row, status: 'APPROVED' });
});

describe('чтение отзывов', () => {
  it('публичные страницы видят только одобренные', async () => {
    await reviews.listApproved();

    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } }),
    );
  });

  it('админка фильтрует по статусу', async () => {
    await reviews.listByStatus('rejected');

    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'REJECTED' } }),
    );
  });

  it('без фильтра отдаёт все статусы', async () => {
    await reviews.listByStatus();

    expect(db.review.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
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

  it('в базу уходит только смена статуса', async () => {
    await reviews.setStatus('r5', 'approved');

    expect(db.review.update).toHaveBeenCalledWith({
      where: { id: 'r5' },
      data: { status: 'APPROVED' },
    });
  });

  it('несуществующий отзыв не обновляется', async () => {
    vi.mocked(db.review.findUnique).mockResolvedValue(null);

    await expect(reviews.setStatus('нет', 'approved')).rejects.toThrow('Отзыв не найден');
    expect(db.review.update).not.toHaveBeenCalled();
  });
});
