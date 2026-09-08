// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { ADMIN_ROLES } from '@/entities/staff/model';

import { roleFromDb, roleToDb } from './roles';

describe('перевод роли между базой и приложением', () => {
  it('каждая роль приложения переводится туда и обратно', () => {
    for (const role of ADMIN_ROLES) {
      expect(roleFromDb(roleToDb(role))).toBe(role);
    }
  });

  it('значения перечисления базы переводятся в роли приложения', () => {
    expect(roleFromDb('OWNER')).toBe('owner');
    expect(roleFromDb('ADMIN')).toBe('admin');
    expect(roleFromDb('MANAGER')).toBe('manager');
    expect(roleFromDb('INSTALLER')).toBe('installer');
  });

  /**
   * 🔴 Главная проверка модуля.
   *
   * Молчаливый `undefined` из словаря не остаётся собой: он доезжает до
   * сессии, там `roles.includes(undefined)` отвечает `false`, и человек видит
   * «Раздел закрыт». Дефект схемы становится неотличим от честного отказа в
   * доступе — снаружи одинаково выглядят «роли нет в словаре» и «этот раздел
   * не ваш». Падение обязано называть значение, чтобы искали словарь, а не
   * дыру в разграничении.
   */
  it('🔴 неизвестное значение падает и называет себя, а не превращается в отказ', () => {
    expect(() => roleFromDb('SUPERVISOR')).toThrow('SUPERVISOR');
    expect(() => roleFromDb('')).toThrow(/словар/i);
    /* Роль приложения в базу не пишется строчными: это тоже промах словаря. */
    expect(() => roleFromDb('owner')).toThrow(/словар/i);
  });
});
