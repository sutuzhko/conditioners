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
  /** Идёт ли прямо сейчас транзакция — этим проверяется неразделимость. */
  inTransaction: false,
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

import { db } from '@/server/db';
import { recordActivity } from '@/server/services/activity';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inTransaction = false;
  mocks.activityCreate.mockResolvedValue({ id: 'a1' });
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
