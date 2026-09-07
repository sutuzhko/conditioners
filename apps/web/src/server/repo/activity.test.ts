// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Форму строки задаёт тест, а не генерик Prisma: репозиторий читает событие с
   `select` и отношением `actor`, а выведенный по умолчанию тип делегата этой
   формы не знает (та же причина, что в `repo/reviews.test.ts`). */
const activityEvent = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
  create: vi.fn<(args?: unknown) => Promise<unknown>>(),
  count: vi.fn<(args?: unknown) => Promise<number>>(),
}));

vi.mock('@/server/db', () => ({ db: { activityEvent } }));

import * as activity from '@/server/repo/activity';

const row = {
  id: 'a1',
  actorId: 'u1',
  actorKind: 'USER' as const,
  actor: { name: 'Богдан', login: 'owner' },
  action: 'review.unpublish',
  entity: 'review',
  entityId: 'r5',
  createdAt: new Date('2026-09-08T06:12:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  activityEvent.findMany.mockResolvedValue([row]);
  activityEvent.count.mockResolvedValue(1);
  activityEvent.create.mockResolvedValue({ id: 'a1' });
});

describe('🔴 событие не правится', () => {
  it('модуль не экспортирует ни одной функции правки записи', () => {
    /* Запись создаёт система, а меняется у неё одна пометка человека — и та
       приходит фазой 5 (ADR-345). Появление здесь `update` или `remove` —
       это дыра, через которую из журнала убирают неудобную строку. */
    expect(Object.keys(activity).sort()).toEqual(['create', 'list']);
  });
});

describe('чтение журнала', () => {
  it('🔴 список ограничен страницей: событий тысячи в месяц', async () => {
    activityEvent.count.mockResolvedValue(20);

    const page = await activity.list({ page: 2 });

    expect(activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 8, take: 8 }),
    );
    expect(page.pages).toBe(3);
  });

  /* Две записи одной миллисекунды без второго поля встают в произвольном
     порядке, и соседние страницы показывают одну строку дважды. */
  it('порядок — по времени и по идентификатору, новые сверху', async () => {
    await activity.list();

    expect(activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    );
  });

  it('автор отдаётся именем; логин — только когда имени нет', async () => {
    activityEvent.findMany.mockResolvedValue([
      row,
      { ...row, id: 'a2', actorId: 'u2', actor: { name: null, login: 'manager' } },
    ]);

    const page = await activity.list();

    expect(page.items[0]?.actor?.name).toBe('Богдан');
    expect(page.items[1]?.actor?.name).toBe('manager');
  });

  /* Учётную запись удалили — связь обнулилась (`SetNull`), а событие осталось:
     история не должна теряться ровно тогда, когда в неё смотрят. */
  it('событие без автора отдаётся без него, а не пропадает', async () => {
    activityEvent.findMany.mockResolvedValue([{ ...row, actorId: null, actor: null }]);

    const page = await activity.list();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.actor).toBeNull();
  });

  /* 🔴 Пустой автор бывает двух видов, и различает их только род: у удалённой
     учётки он остался `user`, у события без автора — `system` (ADR-345). */
  it('род автора доезжает наружу и различает удалённую учётку от системы', async () => {
    activityEvent.findMany.mockResolvedValue([
      { ...row, actorId: null, actor: null, actorKind: 'USER' },
      { ...row, id: 'a2', actorId: null, actor: null, actorKind: 'SYSTEM' },
    ]);

    const page = await activity.list();

    expect(page.items[0]?.actorKind).toBe('user');
    expect(page.items[1]?.actorKind).toBe('system');
  });

  /* 🔴 Персональных данных нет и в том, что читается: наружу идут ссылка на
     сущность и автор-сотрудник, а имя и телефон клиента живут в самой
     сущности (инвариант 12). */
  it('наружу отдаётся ссылка на сущность, а не её содержимое', async () => {
    const page = await activity.list();

    expect(Object.keys(page.items[0] ?? {}).sort()).toEqual(
      ['action', 'actor', 'actorKind', 'createdAt', 'entity', 'entityId', 'id'].sort(),
    );
  });
});

describe('вставка события', () => {
  /**
   * Клиент транзакции: у него из делегатов Prisma нужен только этот.
   *
   * 🔴 Аргумент подмены объявлен типом намеренно. `vi.fn(async () => …)` без
   * параметров даёт `mock.calls` пустым кортежем `[]`: элемента `[0]` у него
   * нет, чтение вызова выводится в `undefined`, и добраться до `data` можно
   * только приведением — а `as` в проекте запрещён. С объявленным аргументом
   * `written()` читается без приведения, и состав строки проверяет уже
   * компилятор, а не только сравнение ключей.
   *
   * Тип возврата не выписан: `ReturnType<typeof vi.fn>` стёр бы форму
   * подмены обратно, а вывод её сохраняет. Функция локальная, наружу не
   * уходит.
   */
  function transaction() {
    const create = vi.fn<(args: { data: Record<string, unknown> }) => Promise<{ id: string }>>();
    create.mockResolvedValue({ id: 'a9' });

    const tx = { activityEvent: { create } };

    return {
      create,
      /* Частичная подмена чужого типа — принятая в проекте форма
         (`auth.test.ts`, `weather.test.ts`): из всех делегатов Prisma клиенту
         транзакции здесь нужен ровно один. */
      client: tx as unknown as Parameters<typeof activity.create>[1],
      /* Не вызывали вовсе — пустой состав: проверка состава назовёт
         недостающие ключи, и это точнее, чем падение по `undefined`. */
      written: (): Record<string, unknown> => create.mock.calls[0]?.[0].data ?? {},
    };
  }

  it('идёт тем клиентом, который передали, а не общим', async () => {
    const tx = transaction();

    await activity.create(
      {
        actorId: 'u1',
        actorKind: 'USER',
        action: 'review.publish',
        entity: 'review',
        entityId: 'r5',
        kind: 'REGULAR',
      },
      tx.client,
    );

    expect(tx.create).toHaveBeenCalledTimes(1);
    expect(activityEvent.create).not.toHaveBeenCalled();
  });

  /* 🔴 Значения рода в проверках не заглушки: они обязаны быть теми, что
     складывает сервис. Строка с автором — всегда `USER`: удалённой учётной
     записью не действуют, значит в момент записи проставленный `actorId`
     означает живую учётку. */
  it('у строки с автором род — учётная запись панели', async () => {
    const tx = transaction();

    await activity.create(
      {
        actorId: 'u1',
        actorKind: 'USER',
        action: 'review.publish',
        entity: 'review',
        entityId: 'r5',
        kind: 'REGULAR',
      },
      tx.client,
    );

    expect(tx.written()).toMatchObject({ actorId: 'u1', actorKind: 'USER' });
  });

  /**
   * 🔴 Полный состав строки, а не отдельные поля.
   *
   * Проверка заведена по следам дефекта: обязательное поле `actorKind`
   * появилось у входа репозитория второй миграцией, а один вызов в этом файле
   * остался без него — гейт упал на типах, потому что Vitest типы не
   * проверяет, а частичное сравнение недостачи не видит.
   *
   * Точный набор ключей превращает тот же промах в красный тест: поле,
   * забытое в литерале, ломает сравнение и без компилятора.
   */
  it('в базу уходит полный состав строки — ни поля меньше, ни поля больше', async () => {
    const tx = transaction();

    await activity.create(
      {
        actorId: 'u1',
        actorKind: 'USER',
        action: 'review.publish',
        entity: 'review',
        entityId: 'r5',
        kind: 'REGULAR',
        changes: { status: { from: 'pending', to: 'approved' } },
      },
      tx.client,
    );

    expect(Object.keys(tx.written()).sort()).toEqual(
      ['action', 'actorId', 'actorKind', 'changes', 'entity', 'entityId', 'kind'].sort(),
    );
  });

  /* 🔴 И обратная пара: без автора род — `SYSTEM`. Разрешить здесь `USER`
     значило бы описать форму, которую сервис не создаёт никогда, — а именно
     она потом читается как «учётную запись удалили». */
  it('у строки без автора род — система, а не удалённая учётка', async () => {
    const tx = transaction();

    await activity.create(
      {
        actorId: null,
        actorKind: 'SYSTEM',
        action: 'review.reject',
        entity: 'review',
        entityId: 'r5',
        kind: 'REGULAR',
      },
      tx.client,
    );

    expect(tx.written()).toMatchObject({ actorId: null, actorKind: 'SYSTEM' });
  });
});
