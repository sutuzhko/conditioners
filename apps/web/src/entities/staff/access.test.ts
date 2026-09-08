import { describe, expect, it } from 'vitest';

import { CLIENT_CYCLE, EVERYONE, FIELD, OWNER, ROLE_LISTS, ROLE_LIST_NAMES } from './access';
import { ADMIN_ROLES } from './model';

describe('перечни ролей', () => {
  /**
   * 🔴 `EVERYONE` выписан значениями, а не собран из `ADMIN_ROLES`: тот —
   * значение из `model.ts`, и вместе с ним в бандл клиентской колонки панели
   * уехала бы Zod со схемами и проверкой ИНН. Цена решения — возможность
   * разойтись, и держит её эта проверка: роль, заведённая в перечислении и
   * забытая здесь, не получила бы даже своего профиля.
   */
  it('🔴 «любой вошедший» — это в точности все роли перечисления', () => {
    expect([...EVERYONE]).toEqual([...ADMIN_ROLES]);
  });

  it('владелец есть в каждом перечне: закрытых от него разделов не бывает', () => {
    for (const name of ROLE_LIST_NAMES) {
      expect(ROLE_LISTS[name]).toContain('owner');
    }
  });

  it('в перечне нет повторов', () => {
    for (const name of ROLE_LIST_NAMES) {
      const roles = ROLE_LISTS[name];
      expect([...new Set(roles)]).toEqual([...roles]);
    }
  });

  it('в перечне нет значений, которых нет в перечислении ролей', () => {
    for (const name of ROLE_LIST_NAMES) {
      for (const role of ROLE_LISTS[name]) {
        expect(ADMIN_ROLES).toContain(role);
      }
    }
  });

  /* 🔴 Реестр и имена нужны контрактным проверкам: они спрашивают у маршрута
     его перечень и называют его словом из таблицы. Перечень, не попавший в
     реестр, стал бы для них «безымянным» — и маршрут под ним не прошёл бы
     проверку, хотя закрыт правильно. */
  it('реестр перечней и список имён описывают одно и то же', () => {
    expect(Object.keys(ROLE_LISTS).sort()).toEqual([...ROLE_LIST_NAMES].sort());
    expect(ROLE_LIST_NAMES.map((name) => ROLE_LISTS[name])).toEqual([
      EVERYONE,
      FIELD,
      CLIENT_CYCLE,
      OWNER,
    ]);
  });

  /* 🔴 Перечни закрытые, а не «все, кроме кого-то»: монтажник не касается
     персональных данных клиента (CRM §6), а менеджер не правит витрину и не
     видит расходов на людей (ADR-344). */
  it('клиентский цикл закрыт монтажнику, выездная работа — менеджеру', () => {
    expect(CLIENT_CYCLE).not.toContain('installer');
    expect(FIELD).not.toContain('manager');
    expect(FIELD).not.toContain('admin');
    expect(OWNER).toEqual(['owner']);
  });
});
