// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORK_TYPE_TONES } from '@/entities/work-type/model';

/* Мок захватывается через `vi.hoisted`: справочник выбирается с `select`, а
   тип модели Prisma требует все поля таблицы — заготовка из десяти полей ради
   двух проверок ничего не объясняла бы. */
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock('@/server/db', () => ({ db: { workType: { findMany: mocks.findMany } } }));

import { iconFromDb, listActive, toMark, toneFromDb, toneToDb } from '@/server/repo/work-types';

const row = {
  id: 'wt_install',
  code: 'install',
  title: 'Монтаж',
  icon: 'wrench',
  tone: 'OK' as const,
  dayLong: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([row]);
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
