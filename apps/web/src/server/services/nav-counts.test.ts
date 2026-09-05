// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Счётчики очередей у пунктов навигации (ADR-309, issue #570).
 *
 * Проверяется не арифметика репозиториев — она их и есть, — а два правила
 * сервиса: очереди считаются разом и показываются только владельцу.
 */
const mocks = vi.hoisted(() => ({
  countActive: vi.fn(),
  countByStatus: vi.fn(),
  countPending: vi.fn(),
}));

vi.mock('@/server/repo/orders', () => ({ countActive: mocks.countActive }));
vi.mock('@/server/repo/leads', () => ({ countByStatus: mocks.countByStatus }));
vi.mock('@/server/repo/reviews', () => ({ countPending: mocks.countPending }));

import { navCounts } from '@/server/services/nav-counts';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.countActive.mockResolvedValue(7);
  mocks.countByStatus.mockResolvedValue(3);
  mocks.countPending.mockResolvedValue(2);
});

describe('счётчики навигации', () => {
  it('владельцу отдаёт три очереди разом', async () => {
    await expect(navCounts('owner')).resolves.toEqual({ orders: 7, leads: 3, reviews: 2 });
    expect(mocks.countByStatus).toHaveBeenCalledWith('new');
  });

  /* Ноль — это ответ, а не пустота: «ни одного отзыва на модерации» владелец
     смотрит каждое утро, и пропавший счётчик читался бы как сбой. */
  it('ноль остаётся числом и со счётчика не пропадает', async () => {
    mocks.countActive.mockResolvedValue(0);
    mocks.countByStatus.mockResolvedValue(0);
    mocks.countPending.mockResolvedValue(0);

    await expect(navCounts('owner')).resolves.toEqual({ orders: 0, leads: 0, reviews: 0 });
  });

  /* 🔴 Все три очереди — очереди владельца: «в работе» считает наряды всей
     бригады, и цифра 7 у монтажника с двумя выездами читалась бы как его
     долг. Заодно ни одного лишнего запроса на каждый заход монтажника. */
  it('монтажнику не показывает ни одной очереди и в базу за ними не ходит', async () => {
    await expect(navCounts('installer')).resolves.toEqual({});

    expect(mocks.countActive).not.toHaveBeenCalled();
    expect(mocks.countByStatus).not.toHaveBeenCalled();
    expect(mocks.countPending).not.toHaveBeenCalled();
  });
});
