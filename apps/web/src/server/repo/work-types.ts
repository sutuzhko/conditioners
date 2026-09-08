/**
 * Справочник видов работ (ADR-343).
 *
 * 🔴 Перечня видов работ здесь нет — есть перевод между базой и приложением.
 * Что такое «Монтаж» и каким цветом он красится, решает владелец из настроек,
 * а не этот модуль: набор видов работ — данные, а не константа (инвариант 8).
 */
import type { WorkTypeTone as DbTone } from '@prisma/client';

import type { WorkTypeMark, WorkTypeTone } from '@/entities/work-type/model';
import { isIconName, type IconName } from '@/shared/ui/Icon';
import { db } from '@/server/db';

/**
 * 🔴 `Record` держит полноту на этапе сборки: краска, добавленная в схему и
 * забытая здесь, не соберётся (тот же приём, что у ролей).
 */
const TONE_FROM_DB: Record<DbTone, WorkTypeTone> = {
  ACCENT: 'accent',
  INFO: 'info',
  OK: 'ok',
  WARN: 'warn',
  SALE: 'sale',
  ERROR: 'error',
  NEUTRAL: 'neutral',
};

const TONE_TO_DB: Record<WorkTypeTone, DbTone> = {
  accent: 'ACCENT',
  info: 'INFO',
  ok: 'OK',
  warn: 'WARN',
  sale: 'SALE',
  error: 'ERROR',
  neutral: 'NEUTRAL',
};

/** Тот же словарь поиском по строке: значение из базы приходит как данные. */
const TONE_LOOKUP = new Map<string, WorkTypeTone>(Object.entries(TONE_FROM_DB));

/**
 * Краска из базы в краску приложения.
 *
 * 🔴 Неизвестное значение бросает, а не подставляет умолчание. Умолчание здесь
 * — худший из возможных ответов: метка календаря покрасилась бы серым и
 * выглядела бы как честно заведённый «нейтральный» вид работ. Такой дефект не
 * видно ни глазом, ни сценарием — его видно только тем, что владелец однажды
 * скажет «а почему монтаж серый».
 *
 * Аргумент принимается строкой намеренно: `DbTone` описывает то, что знает
 * сгенерированный клиент, а приходит то, что лежит в базе, — и расходятся они
 * ровно тогда, когда клиент собран до миграции.
 */
export function toneFromDb(value: string): WorkTypeTone {
  const tone = TONE_LOOKUP.get(value);
  if (tone === undefined) {
    throw new Error(
      `Краска «${value}» из базы не переводится: в палитре видов работ её нет. ` +
        'Скорее всего, значение добавлено в перечисление схемы, но не в ' +
        'server/repo/work-types.ts, либо клиент Prisma собран до миграции.',
    );
  }

  return tone;
}

/** Краска приложения в значение перечисления базы. */
export function toneToDb(tone: WorkTypeTone): DbTone {
  return TONE_TO_DB[tone];
}

/**
 * Значок из базы в имя набора.
 *
 * 🔴 Проверяется по самому набору, а не по копии его списка: второй список
 * значков разошёлся бы с первым на первой же правке набора. Незнакомое имя
 * бросает — `Icon` на нём разваливается уже внутри разметки, и разбираться
 * пришлось бы с падением компонента вместо строки в базе.
 */
export function iconFromDb(value: string): IconName {
  if (!isIconName(value)) {
    throw new Error(
      `Значок «${value}» из базы не найден в наборе кита (shared/ui/Icon). ` +
        'Вид работ ссылается на значок, которого нет: поправьте запись справочника.',
    );
  }

  return value;
}

/**
 * Поля справочника, нужные метке: подпись, значок и краска.
 *
 * Экспортируются, потому что дело календаря выбирается вместе со своим видом
 * работ: `select` вложенной связи в `server/repo/crm.ts` — тот же самый, и
 * вторая его копия разошлась бы с этой молча.
 */
export const MARK_FIELDS = {
  id: true,
  code: true,
  title: true,
  icon: true,
  tone: true,
  dayLong: true,
} as const;

export type WorkTypeMarkRow = {
  id: string;
  code: string;
  title: string;
  icon: string;
  tone: DbTone;
  dayLong: boolean;
};

export function toMark(row: WorkTypeMarkRow): WorkTypeMark {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    icon: iconFromDb(row.icon),
    tone: toneFromDb(row.tone),
    dayLong: row.dayLong,
  };
}

/**
 * Виды работ, которые сегодня предлагают заводить.
 *
 * Отключённые не попадают: они остаются у прежних записей, но новую работу
 * такого вида уже не заводят (ADR-343). Порядок задаёт владелец — «Монтаж»
 * стоит выше «Заметки» не по алфавиту.
 */
export async function listActive(): Promise<readonly WorkTypeMark[]> {
  const rows = await db.workType.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { title: 'asc' }],
    select: MARK_FIELDS,
  });

  return rows.map(toMark);
}
