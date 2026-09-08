// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { SEED_WORK_TYPES } from './work-types';

/**
 * Перенос наряда на справочник видов работ (ADR-343, issue #834, #837).
 *
 * 🔴 Проверяется не «миграция написана», а то, ради чего она писалась:
 * **старый наряд обязан открыться с прежним видом работ**. Наряды — это
 * деньги, адреса и люди, и вид работ у них не выдуман: по нему считается
 * разбор выручки в сводке и собирается инструмент выезда. Обнулить его при
 * переносе значит потерять данные молча.
 *
 * Накат тестом не гоняется — базы у прогона нет. Читается сам файл миграции:
 * он и есть то, что выполнится на боевой базе, и все три соответствия видны в
 * нём буквально. Ошибка в этой строке — единственный способ потерять вид работ
 * у наряда, и цена ей — ручной разбор истории за все годы.
 */
const MIGRATION = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    'migrations',
    '20260908130000_order_work_type',
    'migration.sql',
  ),
  'utf8',
);

/** Значения снятого перечисления `OrderType` и коды справочника под ними. */
const MAPPING: readonly (readonly [string, string])[] = [
  ['INSTALL', 'install'],
  ['SERVICE', 'service'],
  ['REPAIR', 'repair'],
];

describe('наряд переезжает на справочник видов работ', () => {
  it.each(MAPPING)('🔴 наряд с типом %s получает вид работ «%s»', (dbValue, code) => {
    expect(MIGRATION).toMatch(new RegExp(`WHEN\\s+'${dbValue}'\\s+THEN\\s+'${code}'`));
  });

  /**
   * 🔴 Код, которого нет в справочнике, оставил бы наряд без вида работ. Сид и
   * миграция справочника заводят одну и ту же семёрку — сверяемся с ней, а не с
   * переписанным здесь списком.
   */
  it('🔴 каждый код соответствия есть в справочнике', () => {
    const codes = SEED_WORK_TYPES.map((type) => type.code);

    for (const [, code] of MAPPING) expect(codes).toContain(code);
  });

  /**
   * 🔴 Наряд без вида работ дальше нечем ни показать, ни посчитать. Молчаливое
   * `NULL` здесь хуже упавшего наката: накат повторяют, потерянные данные —
   * восстанавливают руками по бумажным журналам.
   */
  it('🔴 непереведённый наряд роняет накат, а не обнуляет вид работ', () => {
    expect(MIGRATION).toContain('RAISE EXCEPTION');
    expect(MIGRATION).toMatch(/ALTER COLUMN "workTypeId" SET NOT NULL/);
  });

  /** Занятый вид работ отключают, а не удаляют — запрет держит и база. */
  it('🔴 удаление вида работ, на который ссылаются наряды, запрещено базой', () => {
    expect(MIGRATION).toMatch(/REFERENCES "WorkType"\("id"\) ON DELETE RESTRICT/);
  });

  /** Перечисления больше нет: перечень видов работ ушёл из схемы вместе с ним. */
  it('перечисление `OrderType` снимается со схемы', () => {
    expect(MIGRATION).toContain('DROP TYPE "OrderType"');
  });
});

describe('заявка получает вид работ', () => {
  const LEAD = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      'migrations',
      '20260908140000_lead_work_type',
      'migration.sql',
    ),
    'utf8',
  );

  /**
   * 🔴 Колонка необязательна, и это решение, а не осторожность (ADR-343):
   * накопленные темы обращений задним числом не разбираются — угаданный по
   * словам вид честнее не становится. `NOT NULL` здесь уронил бы накат на
   * первой же старой заявке.
   */
  it('🔴 у старых заявок вид работ остаётся пустым', () => {
    expect(LEAD).toContain('ADD COLUMN "workTypeId" TEXT;');
    expect(LEAD).not.toContain('SET NOT NULL');
  });

  it('🔴 занятый вид работ и здесь отключают, а не удаляют', () => {
    expect(LEAD).toMatch(/REFERENCES "WorkType"\("id"\) ON DELETE RESTRICT/);
  });
});
