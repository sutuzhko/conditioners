// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { workTypeOptions, type WorkTypeMark } from './work-type';

const install: WorkTypeMark = {
  id: 'wt_install',
  code: 'install',
  title: 'Монтаж',
  icon: 'wrench',
  tone: 'ok',
  dayLong: false,
};

const service: WorkTypeMark = { ...install, id: 'wt_service', code: 'service', title: 'ТО' };

/** Владелец его отключил, а у наряда он остался. */
const drain: WorkTypeMark = { ...install, id: 'wt_drain', code: 'drain', title: 'Чистка дренажа' };

describe('список выбора вида работ', () => {
  it('действующие виды идут как есть и в порядке владельца', () => {
    expect(workTypeOptions([install, service], [])).toEqual([
      { ...install, active: true },
      { ...service, active: true },
    ]);
  });

  /**
   * 🔴 Ради этого функция и заведена (ADR-343): отключение — то, что владелец
   * делает вместо удаления, и наряд с отключённым видом открывался бы на
   * правку с пустым обязательным полем. Владелец увидел бы «вид работ не
   * заполнен» там, где он заполнен, и перезаписал бы его первым попавшимся.
   */
  it('🔴 вид работ записи попадает в список даже отключённым', () => {
    const options = workTypeOptions([install], [drain]);

    expect(options).toHaveLength(2);
    expect(options[1]).toEqual({ ...drain, active: false });
  });

  /** Действующий вид не задваивается оттого, что он же стоит у записи. */
  it('вид работ, который и так действует, второй строкой не приходит', () => {
    expect(workTypeOptions([install, service], [install])).toHaveLength(2);
  });

  /** Две записи одного отключённого вида дают один пункт, а не два. */
  it('повторы среди записей схлопываются', () => {
    const options = workTypeOptions([install], [drain, drain]);

    expect(options).toHaveLength(2);
  });

  it('пустой справочник оставляет только виды записей', () => {
    expect(workTypeOptions([], [drain])).toEqual([{ ...drain, active: false }]);
  });
});
