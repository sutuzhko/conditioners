// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CANCEL_REASONS, cancelReasonTitle } from '@/shared/lib/cancel-reason';

import { cancelReasonFromDb, cancelReasonToDb } from './cancel-reason';

/**
 * 🔴 Словарь `shared/lib/cancel-reason` и перечисление базы `CancelReason` —
 * одно целое, и держит их этим тестом (ADR-311).
 *
 * Без него они разойдутся молча. Таблицы `Record<DbCancelReason, …>` ловят
 * только половину случая: значение, добавленное в перечисление и забытое в
 * таблице, не скомпилируется, а вот причина, добавленная в словарь `shared` и
 * не заведённая в базе, пройдёт типы насквозь и упадёт на записи — у
 * владельца, в момент отказа, а не в CI.
 *
 * Читается схема, а не сгенерированный клиент: `schema.prisma` — источник
 * правды, и он верен даже тогда, когда `prisma generate` в этом дереве ещё не
 * прогоняли. Ровно этот случай описан в стандартах как «tsc лжёт, когда среда
 * разъехалась с проверкой».
 */
const SCHEMA = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'prisma',
  'schema.prisma',
);

/** Значения перечисления `CancelReason`, как они записаны в схеме. */
function enumValuesOf(name: string): readonly string[] {
  const schema = readFileSync(SCHEMA, 'utf8');
  const block = new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`).exec(schema);

  if (block === null) throw new Error(`в schema.prisma нет перечисления ${name}`);

  return (block[1] ?? '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line !== '');
}

describe('Причина отказа: словарь и перечисление базы', () => {
  it('🔴 составы совпадают один в один', () => {
    const inDb = [...enumValuesOf('CancelReason')].sort();
    const inDomain = CANCEL_REASONS.map((reason) => reason.toUpperCase()).sort();

    expect(inDb).toEqual(inDomain);
  });

  it('🔴 перечисление одно на обе сущности: `OrderCancelReason` больше нет', () => {
    /* Второе перечисление с тем же составом — ровно то, что отменил ADR-311:
       разойдутся они при первой правке состава, и каждое по отдельности
       останется верным. */
    expect(() => enumValuesOf('OrderCancelReason')).toThrow();
  });

  it('перевод в базу и обратно возвращает исходный ключ', () => {
    for (const reason of CANCEL_REASONS) {
      expect(cancelReasonFromDb(cancelReasonToDb(reason))).toBe(reason);
    }
  });

  it('🔴 «не отказывались» остаётся собой в обе стороны', () => {
    expect(cancelReasonToDb(null)).toBeNull();
    expect(cancelReasonFromDb(null)).toBeNull();
  });

  it('🔴 ключ «выбрал другого» — `chose_other`: им словари и расходились', () => {
    expect(CANCEL_REASONS).toContain('chose_other');
    expect(CANCEL_REASONS).not.toContain('other_contractor');
    expect(cancelReasonToDb('chose_other')).toBe('CHOSE_OTHER');
  });

  it('у каждой причины есть название словами', () => {
    for (const reason of CANCEL_REASONS) {
      expect(cancelReasonTitle(reason)).not.toBe('');
    }
  });
});
