// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORK_TYPE_TONES } from '@/shared/lib/work-type';

/* Мок захватывается через `vi.hoisted`: справочник выбирается с `select`, а
   тип модели Prisma требует все поля таблицы — заготовка из десяти полей ради
   двух проверок ничего не объясняла бы. */
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  db: {
    workType: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      delete: mocks.deleteFn,
    },
  },
}));

import {
  iconFromDb,
  listActive,
  remove,
  toMark,
  toneFromDb,
  toneToDb,
  toolsOf,
} from '@/server/repo/work-types';

const row = {
  id: 'wt_install',
  code: 'install',
  title: 'Монтаж',
  icon: 'wrench',
  tone: 'OK' as const,
  dayLong: false,
};

/** Свободный вид работ: ни дел, ни нарядов, ни обращений на нём не висит. */
const free = { title: 'Чистка дренажа', _count: { events: 0, orders: 0, leads: 0 } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([row]);
  mocks.findUnique.mockResolvedValue(free);
  mocks.deleteFn.mockResolvedValue(undefined);
});

describe('перевод краски между базой и палитрой', () => {
  it('каждая краска палитры переводится туда и обратно', () => {
    for (const tone of WORK_TYPE_TONES) {
      expect(toneFromDb(toneToDb(tone))).toBe(tone);
    }
  });

  /**
   * 🔴 Главная проверка модуля.
   *
   * Молчаливое умолчание здесь — худший из возможных ответов: метка
   * покрасилась бы серым и читалась как честно заведённый «нейтральный» вид
   * работ. Такой дефект не видно ни глазом, ни сценарием — его находит только
   * владелец вопросом «а почему монтаж серый».
   */
  it('🔴 неизвестная краска падает и называет себя, а не красит серым', () => {
    expect(() => toneFromDb('PURPLE')).toThrow('PURPLE');
    expect(() => toneFromDb('')).toThrow(/палитр/i);
    /* Краска приложения в базу не пишется строчными: это тоже промах словаря. */
    expect(() => toneFromDb('ok')).toThrow(/палитр/i);
  });
});

describe('значок вида работ', () => {
  it('имя из набора кита проходит', () => {
    expect(iconFromDb('wrench')).toBe('wrench');
  });

  /* Незнакомое имя роняет `Icon` уже внутри разметки: разбираться пришлось бы
     с падением компонента вместо строки в базе. */
  it('🔴 значка, которого нет в наборе, не бывает: чтение падает и называет его', () => {
    expect(() => iconFromDb('дрель')).toThrow('дрель');
  });
});

describe('справочник видов работ', () => {
  it('отдаёт подпись, значок и краску записи', async () => {
    const [mark] = await listActive();

    expect(mark).toEqual({
      id: 'wt_install',
      code: 'install',
      title: 'Монтаж',
      icon: 'wrench',
      tone: 'ok',
      dayLong: false,
    });
  });

  /**
   * 🔴 Ради этого справочник и заводился: цвет метки задаёт строка базы, а не
   * код. Тот же вид работ с другой краской в базе приезжает другой краской —
   * между записью и меткой нет ни одного словаря, который мог бы её подменить.
   */
  it('🔴 правка краски в базе меняет краску метки', () => {
    expect(toMark(row).tone).toBe('ok');
    expect(toMark({ ...row, tone: 'ERROR' }).tone).toBe('error');
  });

  it('отключённые виды не предлагаются, порядок задаёт владелец', async () => {
    await listActive();

    const [args] = mocks.findMany.mock.calls[0] ?? [];
    expect(args?.where).toEqual({ active: true });
    expect(args?.orderBy).toEqual([{ sort: 'asc' }, { title: 'asc' }]);
  });
});

describe('инструмент выезда по виду работ', () => {
  /**
   * 🔴 Список приезжает из справочника, а не из таблицы в коде (ADR-343).
   * Владелец правит его сам — до переезда «Чистка дренажа» уехала бы на выезд
   * без единой строки про инструмент, и дописать её было бы некуда.
   */
  it('отдаёт то, что записано у вида работ', async () => {
    mocks.findUnique.mockResolvedValue({ tools: ['Стремянка', 'Труборез'] });

    expect(await toolsOf('wt_install')).toEqual(['Стремянка', 'Труборез']);
  });

  /* Вида работ нет — чеклист собирается без строк инструмента, а не падает:
     наряд с адресом и деньгами важнее строки «взять стремянку». */
  it('вид работ не найден — инструмента нет, но и падения нет', async () => {
    mocks.findUnique.mockResolvedValue(null);

    expect(await toolsOf('wt_ghost')).toEqual([]);
  });
});

describe('удаление вида работ', () => {
  it('свободный вид удаляется', async () => {
    await remove('wt_drain');

    expect(mocks.deleteFn).toHaveBeenCalledWith({ where: { id: 'wt_drain' } });
  });

  /**
   * 🔴 Главная проверка задачи #836.
   *
   * Удаление занятого вида стёрло бы вид у выполненных выездов и нарядов:
   * наряд за прошлый июль перестал бы отвечать на вопрос «что там делали», а
   * разбор выручки по видам в сводке потерял бы строку. Отказ обязан назвать
   * и число записей, и то, что делать вместо удаления.
   */
  it.each([
    ['дела календаря', { events: 3, orders: 0, leads: 0 }],
    ['наряды', { events: 0, orders: 2, leads: 0 }],
    ['обращения', { events: 0, orders: 0, leads: 5 }],
  ])('🔴 вид, на который ссылаются %s, не удаляется — только отключается', async (_what, count) => {
    mocks.findUnique.mockResolvedValue({ title: 'Монтаж', _count: count });

    await expect(remove('wt_install')).rejects.toThrow(/отключите/i);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it('отказ называет число записей и вид работ', async () => {
    mocks.findUnique.mockResolvedValue({
      title: 'Монтаж',
      _count: { events: 1, orders: 2, leads: 4 },
    });

    await expect(remove('wt_install')).rejects.toThrow(/Монтаж.*7 записей/s);
  });

  it('вида работ нет — отказ, а не молчаливое удаление', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(remove('wt_ghost')).rejects.toThrow(/не найден/i);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });
});
