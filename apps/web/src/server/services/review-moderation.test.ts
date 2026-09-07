// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 Ключевое правило фазы: изменение и его событие неразделимы (ADR-345).
 * Откат транзакции не оставляет ни того, ни другого — а значит, обе записи
 * обязаны идти одним клиентом, и падение любой из них обязано уносить всю
 * работу, а не половину.
 *
 * Подменена база и репозиторий отзывов; сервис журнала и его репозиторий —
 * настоящие: проверяется путь целиком, до самого `activityEvent.create`.
 */
const mocks = vi.hoisted(() => ({
  setStatus: vi.fn(),
  /* 🔴 Аргумент объявлен типом: без него `mock.calls` не знает формы вызова,
     и добраться до состава строки можно только приведением — а `as` в
     проекте запрещён. */
  activityCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<{ id: string }>>(),
  /** Идёт ли прямо сейчас транзакция — этим проверяется неразделимость. */
  inTransaction: false,
  /** Клиент, которым воспользовалась каждая из двух записей. */
  statusClient: undefined as unknown,
  activityClient: undefined as unknown,
}));

vi.mock('@/server/db', () => {
  const client = { activityEvent: { create: mocks.activityCreate } };

  return {
    db: {
      ...client,
      $transaction: async (run: (tx: typeof client) => Promise<unknown>): Promise<unknown> => {
        mocks.inTransaction = true;
        try {
          return await run(client);
        } finally {
          mocks.inTransaction = false;
        }
      },
    },
  };
});

vi.mock('@/server/repo/reviews', () => ({ setStatus: mocks.setStatus }));

import type { ReviewModeration } from '@/entities/review/model';
import { moderateReview } from '@/server/services/review-moderation';

const review = {
  id: 'r5',
  name: 'Ирина',
  rating: 5,
  text: 'Приехали в тот же день, всё аккуратно',
  photo: null,
  avatar: null,
  status: 'pending' as const,
  reject: null,
  createdAt: '2026-08-01T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inTransaction = false;
  mocks.statusClient = undefined;
  mocks.activityClient = undefined;

  mocks.setStatus.mockImplementation(async (...args: unknown[]) => {
    mocks.statusClient = args[3];
    return { review, from: 'approved' };
  });

  mocks.activityCreate.mockImplementation(async () => ({ id: 'a1' }));
});

/**
 * Данные записанного события — то, что уехало в `activityEvent.create`.
 *
 * Не вызывали вовсе — пустой состав: проверка назовёт недостающие ключи, и
 * это точнее, чем падение по `undefined`.
 */
function written(): Record<string, unknown> {
  return mocks.activityCreate.mock.calls[0]?.[0].data ?? {};
}

async function moderate(
  moderation: ReviewModeration = { status: 'pending' },
  actorId: string | null = 'u1',
): Promise<unknown> {
  return moderateReview({ id: 'r5', moderation, actorId });
}

describe('🔴 изменение и событие неразделимы', () => {
  it('обе записи идут одним клиентом, и это клиент транзакции', async () => {
    mocks.activityCreate.mockImplementation(async () => {
      mocks.activityClient = mocks.inTransaction;
      return { id: 'a1' };
    });

    await moderate();

    /* Событие писалось внутри транзакции... */
    expect(mocks.activityClient).toBe(true);
    /* ...и смена статуса шла тем же клиентом, а не мимо него. */
    expect(mocks.statusClient).toBeDefined();
    expect(mocks.statusClient).toHaveProperty('activityEvent');
  });

  /* 🔴 Настоящий откат делает Postgres, и доказать его мокой нельзя. Доказать
     здесь можно то, за что отвечает код: упавшая запись события не даёт
     обработчику ответить успехом и не оставляет транзакцию открытой — ошибка
     доходит наружу, и `$transaction` откатывает всё, что в ней было. */
  it('упавшая запись события уносит смену статуса: ошибка доходит наружу', async () => {
    mocks.activityCreate.mockRejectedValue(new Error('журнал недоступен'));

    await expect(moderate()).rejects.toThrow('журнал недоступен');
    expect(mocks.inTransaction).toBe(false);
  });

  it('упавшая смена статуса не оставляет события', async () => {
    mocks.setStatus.mockRejectedValue(new Error('отзыв не найден'));

    await expect(moderate()).rejects.toThrow('отзыв не найден');
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it('статус меняется раньше события: событию нужен переход, а не намерение', async () => {
    await moderate();

    const status = mocks.setStatus.mock.invocationCallOrder[0] ?? 0;
    const event = mocks.activityCreate.mock.invocationCallOrder[0] ?? 0;
    expect(status).toBeLessThan(event);
  });
});

describe('что записано о модерации', () => {
  it.each([
    ['approved', 'review.publish'],
    ['pending', 'review.unpublish'],
    ['archived', 'review.archive'],
  ] as const)('переход в «%s» записывается действием «%s»', async (status, action) => {
    await moderate({ status });

    expect(written().action).toBe(action);
  });

  it('отказ записывается действием «review.reject»', async () => {
    await moderate({ status: 'rejected', reason: 'Реклама конкурента' });

    expect(written().action).toBe('review.reject');
  });

  it('событие ссылается на отзыв, а не на его содержимое', async () => {
    await moderate();

    expect(written()).toMatchObject({ entity: 'review', entityId: 'r5' });
  });

  it('состав изменений — переход статуса, «было → стало»', async () => {
    await moderate({ status: 'pending' });

    expect(written().changes).toEqual({ status: { from: 'approved', to: 'pending' } });
  });

  it('автор берётся у того, кто нажал', async () => {
    await moderate({ status: 'approved' }, 'u7');

    expect(written().actorId).toBe('u7');
  });

  /* Кнопку в Telegram нажимает телеграм-аккаунт, а не учётная запись панели:
     связывать событие не с кем, и выдумывать автора нельзя. */
  it('у модерации из Telegram автора нет, и это записано родом события', async () => {
    await moderate({ status: 'approved' }, null);

    expect(written().actorId).toBeNull();
    /* 🔴 Не «учётку удалили», а «учётной записи не было»: различить это потом
       будет нечем, поэтому род проставляется сейчас (ADR-345). */
    expect(written().actorKind).toBe('SYSTEM');
  });
});

describe('🔴 персональных данных в строке события нет', () => {
  it('ни имени автора отзыва, ни его текста, ни причины отказа', async () => {
    await moderate({ status: 'rejected', reason: 'Реклама конкурента' });

    const row = JSON.stringify(written());
    expect(row).not.toContain(review.name);
    expect(row).not.toContain(review.text);
    expect(row).not.toContain('Реклама конкурента');
  });

  it('в строке только ссылка на сущность, автор, действие и переход', async () => {
    await moderate();

    expect(Object.keys(written()).sort()).toEqual(
      ['action', 'actorId', 'actorKind', 'changes', 'entity', 'entityId', 'kind'].sort(),
    );
  });
});
