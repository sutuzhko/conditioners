// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { CLIENT_CYCLE, EVERYONE, FIELD, OWNER } from '@/entities/staff/access';
import { ADMIN_ROLES, type AdminRole } from '@/entities/staff/model';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@/entities/staff/permissions';

import {
  accessAllows,
  adminPageAllows,
  apiPermissionRule,
  pagePermissionRule,
  rulePasses,
} from './permissions';

/**
 * Центральная карта разрешений — рубеж, который стоит поверх ролей (ADR-344).
 *
 * 🔴 Проверяется прежде всего закрытость: разрешение по умолчанию не выдаётся
 * ни адресу, которого в карте нет, ни набору, в котором требуемого нет. Ошибка
 * здесь стоит не отказа в доступе, а доступа — то есть замечена будет не
 * владельцем, а по последствиям.
 */
const NOTHING: readonly AdminPermission[] = [];

function allows(params: {
  role: AdminRole;
  permissions?: readonly AdminPermission[];
  roles: readonly AdminRole[];
  pathname: string;
  method?: string;
}): boolean {
  return accessAllows({
    role: params.role,
    permissions: params.permissions ?? NOTHING,
    roles: params.roles,
    rule: apiPermissionRule(params.pathname, params.method ?? 'GET'),
  });
}

describe('карта разрешений: разбор адреса ручки', () => {
  it('раздел берётся по первому сегменту, а не по совпадению строк', () => {
    expect([
      apiPermissionRule('/api/admin/leads', 'GET'),
      apiPermissionRule('/api/admin/leads/abc123', 'GET'),
      apiPermissionRule('/api/admin/leads/abc123/photo', 'GET'),
    ]).toEqual([
      { kind: 'permissions', required: ['leads'] },
      { kind: 'permissions', required: ['leads'] },
      { kind: 'permissions', required: ['leads'] },
    ]);
  });

  it('🔴 опасное действие требуется сверх раздела, а не вместо него', () => {
    expect(apiPermissionRule('/api/admin/leads/abc123', 'DELETE')).toEqual({
      kind: 'permissions',
      required: ['leads', 'data_delete'],
    });
  });

  it('исключение выбирается по методу: чтение раздела опасным не становится', () => {
    expect([
      apiPermissionRule('/api/admin/prices', 'GET'),
      apiPermissionRule('/api/admin/prices', 'PUT'),
    ]).toEqual([
      { kind: 'permissions', required: ['prices'] },
      { kind: 'permissions', required: ['prices', 'money'] },
    ]);
  });

  it('🔴 звёздочка шаблона — ровно один сегмент, а не любой хвост', () => {
    /* `staff/*​/notes/* DELETE` не должен ловить `staff/{id} DELETE` и
       наоборот: иначе удаление заметки требовало бы права на удаление
       сотрудника, а удаление сотрудника обходилось бы без него. */
    expect([
      apiPermissionRule('/api/admin/staff/u1', 'DELETE'),
      apiPermissionRule('/api/admin/staff/u1/notes/n1', 'DELETE'),
    ]).toEqual([
      { kind: 'permissions', required: ['team', 'people', 'data_delete'] },
      { kind: 'permissions', required: ['team', 'people'] },
    ]);
  });

  it('🔴 адрес, которого в карте нет, разрешения не получает', () => {
    expect([
      apiPermissionRule('/api/admin/unknown', 'GET'),
      apiPermissionRule('/api/admin', 'GET'),
      apiPermissionRule('/admin/leads', 'GET'),
      apiPermissionRule('/api/leads', 'POST'),
    ]).toEqual([null, null, null, null]);
  });
});

describe('карта разрешений: набор администратора', () => {
  it('🔴 требуется весь перечень, а не любое из него', () => {
    const rule = apiPermissionRule('/api/admin/leads/abc123', 'DELETE');

    expect([
      rulePasses(rule, ['leads']),
      rulePasses(rule, ['data_delete']),
      rulePasses(rule, ['leads', 'data_delete']),
    ]).toEqual([false, false, true]);
  });

  it('🔴 владельческий адрес не открывается никаким набором', () => {
    const rule = apiPermissionRule('/api/admin/staff/u1/access', 'PATCH');

    expect([rulePasses(rule, ADMIN_PERMISSIONS), rulePasses(rule, NOTHING)]).toEqual([
      false,
      false,
    ]);
  });

  it('свой профиль открыт и с пустым набором', () => {
    expect(rulePasses(apiPermissionRule('/api/admin/profile', 'PATCH'), NOTHING)).toBe(true);
  });

  it('🔴 неизвестный адрес закрыт и обладателю всех разрешений', () => {
    expect(rulePasses(null, ADMIN_PERMISSIONS)).toBe(false);
  });
});

describe('кто отвечает на вопрос доступа', () => {
  /* 🔴 Три роли из четырёх карта не спрашивает вовсе: их доступ задан
     перечнями `entities/staff/access` целиком, и появление разрешений его не
     сдвигает ни на один маршрут. */
  it.each(ADMIN_ROLES.filter((role) => role !== 'admin'))(
    'роль %s ходит по перечню ролей, а не по разрешениям',
    (role) => {
      const inList = allows({ role, roles: EVERYONE, pathname: '/api/admin/profile' });
      const outOfList = allows({ role, roles: OWNER, pathname: '/api/admin/prices' });

      expect({ inList, outOfList }).toEqual({ inList: true, outOfList: role === 'owner' });
    },
  );

  it('🔴 у администратора перечень ролей не спрашивается: решает набор', () => {
    /* Перечень `FIELD` администратора не называет — и всё же с выданным
       разделом он проходит: ADR-344 даёт ему права владельца под
       переключателями, и «роль не в перечне» тут не ответ. */
    expect(
      allows({
        role: 'admin',
        permissions: ['orders'],
        roles: FIELD,
        pathname: '/api/admin/orders',
      }),
    ).toBe(true);
  });

  it('🔴 снятый переключатель закрывает раздел, названный в перечне ролей', () => {
    /* Обратная сторона того же правила: «Заявки» открыты администратору
       перечнем `CLIENT_CYCLE`, но без разрешения он туда не проходит. */
    expect([
      allows({
        role: 'admin',
        permissions: ['leads'],
        roles: CLIENT_CYCLE,
        pathname: '/api/admin/leads',
      }),
      allows({ role: 'admin', permissions: [], roles: CLIENT_CYCLE, pathname: '/api/admin/leads' }),
    ]).toEqual([true, false]);
  });

  it('🔴 администратор без набора не проходит никуда, кроме своего профиля', () => {
    expect([
      allows({ role: 'admin', roles: EVERYONE, pathname: '/api/admin/profile' }),
      allows({ role: 'admin', roles: EVERYONE, pathname: '/api/admin/leads' }),
      allows({ role: 'admin', roles: OWNER, pathname: '/api/admin/staff' }),
    ]).toEqual([true, false, false]);
  });
});

describe('карта разрешений: страницы панели', () => {
  it('раздел страницы — первый сегмент после /admin', () => {
    expect([
      pagePermissionRule('/admin'),
      pagePermissionRule('/admin/team/u1'),
      pagePermissionRule('/admin/activity'),
    ]).toEqual([
      { kind: 'permissions', required: ['overview'] },
      { kind: 'permissions', required: ['team'] },
      { kind: 'owner' },
    ]);
  });

  it('🔴 без адреса администратор не проходит: не узнали раздел — значит нет', () => {
    expect(adminPageAllows('', ADMIN_PERMISSIONS)).toBe(false);
  });

  it('страница раздела открывается ровно своим разрешением', () => {
    expect([
      adminPageAllows('/admin/catalog/abc', ['catalog']),
      adminPageAllows('/admin/catalog/abc', ['knowledge']),
    ]).toEqual([true, false]);
  });
});
