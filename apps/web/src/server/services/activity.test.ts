// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Правила журнала событий, за нарушение которых отвечать нечем: событие
 * пишется вместе с изменением, `id` и `createdAt` задаёт база, персональных
 * данных в строке нет (ADR-345, PRD §«Технические ограничения»).
 */
const mocks = vi.hoisted(() => ({
  /* 🔴 Аргумент объявлен типом: без него `mock.calls` не знает формы вызова,
     и добраться до состава строки можно только приведением — а `as` в
     проекте запрещён. */
  activityCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<{ id: string }>>(),
  /** Удаление периода: чистка обязана идти той же транзакцией, что и её след. */
  activityDeleteMany:
    vi.fn<(args: { where: Record<string, unknown> }) => Promise<{ count: number }>>(),
  /** Идёт ли прямо сейчас транзакция — этим проверяется неразделимость. */
  inTransaction: false,
}));

vi.mock('@/server/db', () => {
  const client = {
    activityEvent: { create: mocks.activityCreate, deleteMany: mocks.activityDeleteMany },
  };

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

import { db } from '@/server/db';
import { cleanupActivity, recordActivity } from '@/server/services/activity';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inTransaction = false;
  mocks.activityCreate.mockResolvedValue({ id: 'a1' });
  mocks.activityDeleteMany.mockResolvedValue({ count: 0 });
});

/** Обращение к сервису так, как его зовёт раздел: изнутри своей транзакции. */
async function inTransaction(): Promise<Record<string, unknown>> {
  await db.$transaction(async (tx) => {
    await recordActivity(
      {
        actorId: 'u1',
        action: 'review.unpublish',
        entity: 'review',
        entityId: 'r5',
        changes: { status: { from: 'approved', to: 'pending' } },
      },
      tx,
    );
  });

  return written();
}

/**
 * Состав строки, ушедшей в базу.
 *
 * Не вызывали вовсе — пустой состав: проверка назовёт недостающие ключи, и
 * это точнее, чем падение по `undefined`.
 */
function written(): Record<string, unknown> {
  return mocks.activityCreate.mock.calls[0]?.[0].data ?? {};
}

describe('запись события', () => {
  it('🔴 уходит в базу тем же клиентом, что и само изменение', async () => {
    let wrote = false;
    mocks.activityCreate.mockImplementation(async () => {
      wrote = mocks.inTransaction;
      return { id: 'a1' };
    });

    await inTransaction();

    expect(wrote).toBe(true);
  });

  it('называет автора, действие, сущность и её идентификатор', async () => {
    const data = await inTransaction();

    expect(data).toMatchObject({
      actorId: 'u1',
      action: 'review.unpublish',
      entity: 'review',
      entityId: 'r5',
    });
  });

  it('состав изменений уходит отдельным полем — он чистится первым', async () => {
    const data = await inTransaction();

    expect(data.changes).toEqual({ status: { from: 'approved', to: 'pending' } });
  });

  it('без состава изменений поле остаётся пустым, а не пустым объектом', async () => {
    await db.$transaction(async (tx) => {
      await recordActivity(
        { actorId: 'u1', action: 'review.reject', entity: 'review', entityId: 'r5' },
        tx,
      );
    });

    const data = written();
    expect(data.changes).toBeUndefined();
  });

  /* 🔴 Событие сайта автора не имеет: заявку оставляет посетитель, а не
     учётная запись панели (фаза 3, ADR-358). Схема это допускает, и сервис
     обязан допускать тоже — иначе фаза 3 начнётся с переписывания миграции. */
  it('автор может быть неизвестен', async () => {
    await db.$transaction(async (tx) => {
      await recordActivity(
        { actorId: null, action: 'review.publish', entity: 'review', entityId: 'r5' },
        tx,
      );
    });

    const data = written();
    expect(data.actorId).toBeNull();
  });

  /* 🔴 Род автора замораживается в момент записи, пока он ещё выводится
     однозначно: удалённой учётной записью не действуют (ADR-345). */
  it('с автором род записи — учётная запись панели', async () => {
    const data = await inTransaction();

    expect(data.actorKind).toBe('USER');
  });

  it('без автора род записи — система, и это не то же, что удалённая учётка', async () => {
    await db.$transaction(async (tx) => {
      await recordActivity(
        { actorId: null, action: 'review.publish', entity: 'review', entityId: 'r5' },
        tx,
      );
    });

    const data = written();
    expect(data.actorKind).toBe('SYSTEM');
  });

  it('вид события по умолчанию обычный, а не безопасность', async () => {
    const data = await inTransaction();

    expect(data.kind).toBe('REGULAR');
  });

  it('событие безопасности просят явно', async () => {
    await db.$transaction(async (tx) => {
      await recordActivity(
        {
          actorId: 'u1',
          action: 'review.reject',
          entity: 'review',
          entityId: 'r5',
          kind: 'security',
        },
        tx,
      );
    });

    const data = written();
    expect(data.kind).toBe('SECURITY');
  });
});

describe('🔴 запись неизменяема', () => {
  it('`id` и `createdAt` не задаются вызывающим — их ставит база', async () => {
    const data = await inTransaction();

    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('createdAt');
  });

  /* Пометка человека — единственное правимое поле (ADR-345), и заводится она
     фазой 5. При создании события её нет: событие, приехавшее с готовым
     комментарием, означало бы, что комментарий написала система. */
  it('пометка при создании не заполняется', async () => {
    const data = await inTransaction();

    expect(data).not.toHaveProperty('note');
    expect(data).not.toHaveProperty('noteUpdatedAt');
  });
});

describe('🔴 персональных данных в строке нет', () => {
  it('сервису нечем их передать: он берёт ссылку на сущность, а не её содержимое', async () => {
    const data = await inTransaction();

    expect(Object.keys(data).sort()).toEqual(
      ['action', 'actorId', 'actorKind', 'changes', 'entity', 'entityId', 'kind'].sort(),
    );
  });
});

describe('чистка журнала за период', () => {
  const period = { from: '2025-01-01', to: '2025-12-31' };

  /**
   * 🔴 Удаление и след неразделимы — как изменение и его событие.
   *
   * Оборвись запись следа, журнал стал бы короче на год без единой строки о
   * том, куда делись записи. Проверяется тем же способом: клиент, которым
   * шли обе записи, обязан быть клиентом транзакции.
   */
  it('удаление и след чистки идут одной транзакцией', async () => {
    let deletedInside = false;
    let wroteInside = false;

    mocks.activityDeleteMany.mockImplementation(async () => {
      deletedInside = mocks.inTransaction;
      return { count: 3 };
    });
    mocks.activityCreate.mockImplementation(async () => {
      wroteInside = mocks.inTransaction;
      return { id: 'a9' };
    });

    await cleanupActivity({ period, actorId: 'u1' });

    expect({ deletedInside, wroteInside }).toEqual({ deletedInside: true, wroteInside: true });
  });

  it('след чистки называет период и автора', async () => {
    mocks.activityDeleteMany.mockResolvedValue({ count: 12_408 });

    await cleanupActivity({ period, actorId: 'u1' });

    expect(written()).toMatchObject({
      actorId: 'u1',
      action: 'activity.cleanup',
      entity: 'activity',
      entityId: '2025-01-01..2025-12-31',
    });
  });

  /* «Было → стало» здесь буквальное: столько событий за период лежало в
     журнале, и столько осталось. Число берётся у самого удаления — след,
     назвавший другое, врал бы о том, что сделал. */
  it('след называет, сколько записей унесла чистка', async () => {
    mocks.activityDeleteMany.mockResolvedValue({ count: 12_408 });

    const result = await cleanupActivity({ period, actorId: 'u1' });

    expect(result).toEqual({ removed: 12_408 });
    expect(written().changes).toEqual({ events: { from: 12_408, to: 0 } });
  });

  /**
   * 🔴 След чистки — событие безопасности, а не обычное (ADR-345).
   *
   * Сроки хранения разные: обычное живёт 12 месяцев, событие безопасности 36.
   * След чистки, который сам вычищается уборкой через год, не доказывает
   * ничего.
   */
  it('след чистки — событие безопасности: у него срок втрое длиннее', async () => {
    await cleanupActivity({ period, actorId: 'u1' });

    expect(written().kind).toBe('SECURITY');
  });

  /**
   * 🔴 Главное свойство фазы (issue #822): след переживает чистку **условием
   * запроса**, а не порядком вызовов.
   *
   * Проверка чистит период, внутрь которого попадает сама запись о чистке, —
   * то есть повторяет худший случай: вторую чистку того же периода. Условие
   * удаления обязано исключать след независимо от того, что и когда записано.
   *
   * Сравнение полное, а не по вхождению подстроки: «в условии упоминается
   * `activity.cleanup`» прошло бы и на `in` вместо `notIn` — то есть на
   * запросе, который удаляет ровно то, что обязан беречь.
   */
  it('чистка периода, в который попадает и она сама, след не уносит', async () => {
    await cleanupActivity({ period: { from: '2025-01-01', to: '2099-12-31' }, actorId: 'u1' });

    expect(mocks.activityDeleteMany.mock.calls[0]?.[0].where).toEqual({
      createdAt: {
        gte: new Date('2024-12-31T21:00:00.000Z'),
        lt: new Date('2099-12-31T21:00:00.000Z'),
      },
      kind: { not: 'SECURITY' },
      action: { notIn: ['activity.cleanup'] },
    });
  });

  /**
   * 🔴 Событий безопасности ручная чистка не касается вовсе.
   *
   * Срок хранения у них 36 месяцев против 12 (ADR-345), и кнопка в панели не
   * должна быть сильнее того, что решено про хранение: журнал, из которого
   * владелец убирает отказы входа и смены ролей, перестаёт защищать в ту
   * сторону, ради которой заведён. Уборка по расписанию (фаза 6) свои сроки
   * применит сама.
   */
  it('чистка не трогает события безопасности — ни отказ входа, ни смену роли', async () => {
    await cleanupActivity({ period, actorId: 'u1' });

    expect(mocks.activityDeleteMany.mock.calls[0]?.[0].where).toMatchObject({
      kind: { not: 'SECURITY' },
    });
  });
});
