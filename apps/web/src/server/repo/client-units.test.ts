// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dayOf } from '@/entities/client/lib/units';

/**
 * База подменена целиком: проверяются решения переноса — что записать, чего не
 * записывать дважды и какой срок гарантии считать, — а не работа Prisma.
 */
const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    order: { findUnique: vi.fn() },
    clientUnit: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    setting: { findUnique: vi.fn() },
  },
}));

vi.mock('@/server/db', () => ({ db: dbMock }));

const { fromCompletedOrder, remove } = await import('./client-units');

const INSTALLED_AT = new Date('2026-07-14T06:30:00.000Z');

function order(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clientId: 'c1',
    type: 'INSTALL',
    at: INSTALLED_AT,
    units: [{ model: 'Сплит-система 09', equip: 'CONDITIONER', source: 'OURS' }],
    photos: [{ url: '/api/media/after-1.jpg' }],
    ...patch,
  };
}

type CreatedUnit = {
  readonly clientId: string;
  readonly model: string;
  readonly installedAt: Date;
  readonly warrantyUntil: Date | null;
  readonly photo: string | null;
  readonly orderId: string;
};

/** Что ушло в базу одной пачкой. */
function created(): readonly CreatedUnit[] {
  const args = dbMock.clientUnit.createMany.mock.calls[0]?.[0];
  return args?.data ?? [];
}

/** Последний день гарантии записи — днём, а не моментом: сравнивать проще. */
function warrantyDay(index: number): string | null {
  const value = created()[index]?.warrantyUntil ?? null;
  return value === null ? null : dayOf(value);
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.order.findUnique.mockResolvedValue(order());
  dbMock.clientUnit.findMany.mockResolvedValue([]);
  dbMock.clientUnit.createMany.mockResolvedValue({ count: 1 });
  dbMock.setting.findUnique.mockResolvedValue({
    key: 'warranty',
    value: { installation: 'Гарантия на монтаж — 3 года', equipment: '5 лет' },
  });
});

describe('техника из выполненного монтажа', () => {
  it('🔴 появляется сама: модель, дата и снимок — из наряда', async () => {
    const result = await fromCompletedOrder('o1');

    expect(result).toEqual({ created: 1, kept: 0, failed: false });
    expect(created()[0]).toMatchObject({
      clientId: 'c1',
      model: 'Сплит-система 09',
      installedAt: INSTALLED_AT,
      photo: '/api/media/after-1.jpg',
      orderId: 'o1',
    });
  });

  it('гарантия считается от даты монтажа по сроку из настроек', async () => {
    await fromCompletedOrder('o1');

    expect(warrantyDay(0)).toBe('2031-07-14');
  });

  it('🔴 у техники клиента гарантия на работы, а не на оборудование', async () => {
    dbMock.order.findUnique.mockResolvedValue(
      order({
        units: [
          { model: 'Наш сплит', equip: 'CONDITIONER', source: 'OURS' },
          { model: 'Сплит клиента', equip: 'CONDITIONER', source: 'CLIENT' },
        ],
      }),
    );

    await fromCompletedOrder('o1');

    // наше — пять лет на технику, клиента — три года на монтаж
    expect(warrantyDay(0)).toBe('2031-07-14');
    expect(warrantyDay(1)).toBe('2029-07-14');
  });

  it('🔴 оборудование клиента переносится наравне со своим: монтаж всё равно наш', async () => {
    dbMock.order.findUnique.mockResolvedValue(
      order({ units: [{ model: 'Сплит клиента', equip: 'CONDITIONER', source: 'CLIENT' }] }),
    );

    await fromCompletedOrder('o1');

    expect(created()).toHaveLength(1);
  });

  it('🔴 повторное закрытие наряда дублей не плодит', async () => {
    dbMock.clientUnit.findMany.mockResolvedValue([{ model: 'Сплит-система 09' }]);

    const result = await fromCompletedOrder('o1');

    expect(dbMock.clientUnit.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, kept: 1, failed: false });
  });

  it('дописанная после закрытия позиция появляется, остальные — нет', async () => {
    dbMock.order.findUnique.mockResolvedValue(
      order({
        units: [
          { model: 'Сплит-система 09', equip: 'CONDITIONER', source: 'OURS' },
          { model: 'Тепловая завеса 1500', equip: 'HEAT_CURTAIN', source: 'OURS' },
        ],
      }),
    );
    dbMock.clientUnit.findMany.mockResolvedValue([{ model: 'Сплит-система 09' }]);

    await fromCompletedOrder('o1');

    expect(created()).toHaveLength(1);
    expect(created()[0]).toMatchObject({ model: 'Тепловая завеса 1500' });
  });

  it('позиция без модели записывается по виду оборудования: что-то же там стоит', async () => {
    dbMock.order.findUnique.mockResolvedValue(
      order({ units: [{ model: null, equip: 'HEAT_CURTAIN', source: 'OURS' }] }),
    );

    await fromCompletedOrder('o1');

    expect(created()[0]).toMatchObject({ model: 'Тепловая завеса' });
  });

  it('ТО и ремонт техники не заводят: они приезжают к тому, что уже стоит', async () => {
    dbMock.order.findUnique.mockResolvedValue(order({ type: 'SERVICE' }));

    const result = await fromCompletedOrder('o1');

    expect(dbMock.clientUnit.createMany).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
  });

  it('наряд без позиций записывать нечем', async () => {
    dbMock.order.findUnique.mockResolvedValue(order({ units: [] }));

    await fromCompletedOrder('o1');

    expect(dbMock.clientUnit.createMany).not.toHaveBeenCalled();
  });

  it('фотографии «после» ещё нет — техника всё равно записывается', async () => {
    dbMock.order.findUnique.mockResolvedValue(order({ photos: [] }));

    await fromCompletedOrder('o1');

    expect(created()[0]).toMatchObject({ photo: null });
  });

  it('🔴 неоднозначный срок гарантии датой не становится', async () => {
    dbMock.setting.findUnique.mockResolvedValue({
      key: 'warranty',
      value: { installation: 'от 1 до 5 лет по договору', equipment: 'зависит от модели' },
    });

    await fromCompletedOrder('o1');

    expect(created()[0]).toMatchObject({ warrantyUntil: null });
  });

  it('настроек гарантии нет — техника записывается без даты, а не пропадает', async () => {
    dbMock.setting.findUnique.mockResolvedValue(null);

    const result = await fromCompletedOrder('o1');

    expect(result.created).toBe(1);
    expect(created()[0]).toMatchObject({ warrantyUntil: null });
  });

  it('🔴 отказ базы не роняет закрытие наряда', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dbMock.clientUnit.createMany.mockRejectedValue(new Error('соединение потеряно'));

    await expect(fromCompletedOrder('o1')).resolves.toEqual({
      created: 0,
      kept: 0,
      failed: true,
    });

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('наряда нет — переносить нечего', async () => {
    dbMock.order.findUnique.mockResolvedValue(null);

    await expect(fromCompletedOrder('o1')).resolves.toEqual({
      created: 0,
      kept: 0,
      failed: false,
    });
  });
});

describe('удаление записи', () => {
  it('🔴 чужая запись по угаданному номеру не удаляется', async () => {
    dbMock.clientUnit.deleteMany.mockResolvedValue({ count: 0 });

    await expect(remove('c1', 'u-чужой')).rejects.toThrow('Запись о технике не найдена');
    expect(dbMock.clientUnit.deleteMany).toHaveBeenCalledWith({
      where: { id: 'u-чужой', clientId: 'c1' },
    });
  });
});
