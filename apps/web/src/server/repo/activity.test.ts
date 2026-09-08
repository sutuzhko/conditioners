// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Форму строки задаёт тест, а не генерик Prisma: репозиторий читает событие с
   `select` и отношением `actor`, а выведенный по умолчанию тип делегата этой
   формы не знает (та же причина, что в `repo/reviews.test.ts`). */
const activityEvent = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
  findUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  create: vi.fn<(args?: unknown) => Promise<unknown>>(),
  update: vi.fn<(args?: unknown) => Promise<unknown>>(),
  deleteMany: vi.fn<(args?: unknown) => Promise<{ count: number }>>(),
  count: vi.fn<(args?: unknown) => Promise<number>>(),
}));

vi.mock('@/server/db', () => ({ db: { activityEvent } }));

import { EMPTY_ACTIVITY_FILTER } from '@/entities/activity/model';
import * as activity from '@/server/repo/activity';

const row = {
  id: 'a1',
  actorId: 'u1',
  actorKind: 'USER' as const,
  actor: { name: 'Богдан', login: 'owner' },
  action: 'review.unpublish',
  entity: 'review',
  entityId: 'r5',
  note: null,
  noteUpdatedAt: null,
  createdAt: new Date('2026-09-08T06:12:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  activityEvent.findMany.mockResolvedValue([row]);
  activityEvent.findUnique.mockResolvedValue({ id: 'a1' });
  activityEvent.count.mockResolvedValue(1);
  activityEvent.create.mockResolvedValue({ id: 'a1' });
  activityEvent.update.mockResolvedValue(row);
  activityEvent.deleteMany.mockResolvedValue({ count: 0 });
});

/** Условия запроса последнего вызова `findMany` — им проверяется отбор. */
function lastWhere(): Record<string, unknown> {
  const call: unknown = activityEvent.findMany.mock.calls.at(-1)?.[0];
  if (typeof call !== 'object' || call === null || !('where' in call)) return {};

  const where: unknown = call.where;
  return typeof where === 'object' && where !== null ? { ...where } : {};
}

describe('🔴 событие не правится', () => {
  it('модуль не экспортирует ни одной функции правки записи', () => {
    /* 🔴 Список закрытый, и в нём нет ни `update`, ни `remove`. Запись создаёт
       система; правится у неё одна пометка (`setNote`), а удаление бывает
       только чисткой за период (`removeBetween`), и обе границы у неё
       обязательны. Появление здесь функции, переписывающей автора, время или
       состав изменений, — это дыра, через которую из журнала убирают
       неудобную строку (ADR-345, issue #821). */
    expect(Object.keys(activity).sort()).toEqual(['create', 'list', 'removeBetween', 'setNote']);
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
      [
        'action',
        'actor',
        'actorKind',
        'createdAt',
        'entity',
        'entityId',
        'id',
        'note',
        'noteUpdatedAt',
      ].sort(),
    );
  });
});

describe('отбор журнала', () => {
  it('пустой отбор не ставит ни одного условия', async () => {
    await activity.list({ filter: EMPTY_ACTIVITY_FILTER });

    expect(lastWhere()).toEqual({});
  });

  it('человек отбирается по учётной записи', async () => {
    await activity.list({ filter: { ...EMPTY_ACTIVITY_FILTER, actor: 'u2' } });

    expect(lastWhere()).toEqual({ actorId: 'u2' });
  });

  /* Своей копии роли у события нет: она читается у самой учётной записи
     (см. `ActivityFilter`). Событие без автора в такой отбор не попадает. */
  it('роль отбирается у автора, а не у события', async () => {
    await activity.list({ filter: { ...EMPTY_ACTIVITY_FILTER, role: 'manager' } });

    expect(lastWhere()).toEqual({ actor: { role: 'MANAGER' } });
  });

  /* 🔴 Списком действий, а не сравнением с началом строки: индекс по `action`
     префикс при русской сортировке не обслуживает, и отбор раздела читал бы
     таблицу целиком. */
  it('раздел отбирается перечнем своих действий', async () => {
    await activity.list({ filter: { ...EMPTY_ACTIVITY_FILTER, section: 'review' } });

    expect(lastWhere()).toEqual({
      action: {
        in: ['review.publish', 'review.unpublish', 'review.reject', 'review.archive'],
      },
    });
  });

  it('сущность отбирается своим полем, а не через действие', async () => {
    await activity.list({ filter: { ...EMPTY_ACTIVITY_FILTER, entity: 'review' } });

    expect(lastWhere()).toEqual({ entity: 'review' });
  });

  /* Верхняя граница исключающая — московская полночь следующих суток: с `lte`
     терялись бы события последней миллисекунды дня. */
  it('период ложится на время включающей нижней и исключающей верхней границей', async () => {
    await activity.list({
      filter: { ...EMPTY_ACTIVITY_FILTER, from: '2026-09-01', to: '2026-09-07' },
    });

    expect(lastWhere()).toEqual({
      createdAt: {
        gte: new Date('2026-08-31T21:00:00.000Z'),
        lt: new Date('2026-09-07T21:00:00.000Z'),
      },
    });
  });

  /* 🔴 Счётчик страниц и сама выборка обязаны отбирать одно и то же: разойдясь,
     они дают «страница 3 из 7» над пустой таблицей. */
  it('счёт для разбивки идёт по тем же условиям, что и выборка', async () => {
    await activity.list({ filter: { ...EMPTY_ACTIVITY_FILTER, actor: 'u2' } });

    expect(activityEvent.count).toHaveBeenCalledWith({ where: { actorId: 'u2' } });
  });
});

describe('пометка человека у записи', () => {
  it('правит пометку и отмечает, когда её правили', async () => {
    await activity.setNote('a1', 'разобрались');

    expect(activityEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { note: 'разобрались', noteUpdatedAt: expect.any(Date) },
      }),
    );
  });

  /* Пустая пометка стирается вместе с меткой времени: `noteUpdatedAt` отвечает
     на вопрос «когда комментировали», и у записи без комментария ответа нет. */
  it('пустая пометка стирает и отметку времени', async () => {
    await activity.setNote('a1', '   ');

    expect(activityEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { note: null, noteUpdatedAt: null } }),
    );
  });

  it('несуществующая запись отвечает отказом, а не создаёт строку', async () => {
    activityEvent.findUnique.mockResolvedValue(null);

    await expect(activity.setNote('нет', 'разобрались')).rejects.toThrow(
      'Запись журнала не найдена',
    );
    expect(activityEvent.update).not.toHaveBeenCalled();
  });
});

describe('🔴 чистка за период', () => {
  const period = {
    since: new Date('2025-01-01T00:00:00.000Z'),
    until: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('удаляет только то, что попало в период', async () => {
    await activity.removeBetween(period);

    expect(activityEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: period.since, lt: period.until },
        action: { notIn: ['activity.cleanup'] },
      },
    });
  });

  /**
   * 🔴 След чистки исключается условием запроса, а не порядком вызовов
   * (issue #822).
   *
   * Порядок «сначала удалить, потом записать» защищает ровно один раз: вторая
   * чистка того же периода унесла бы след первой, и журнал перестал бы
   * отвечать, кто и когда его чистил. Проверка смотрит именно на условие —
   * она останется красной и в том случае, если след будут беречь порядком.
   */
  it('след чистки исключён самим условием удаления', async () => {
    await activity.removeBetween(period);

    const where: unknown = activityEvent.deleteMany.mock.calls[0]?.[0];
    expect(JSON.stringify(where)).toContain('activity.cleanup');
  });

  it('возвращает число удалённых записей — им подписан след', async () => {
    activityEvent.deleteMany.mockResolvedValue({ count: 12_408 });

    expect(await activity.removeBetween(period)).toBe(12_408);
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
