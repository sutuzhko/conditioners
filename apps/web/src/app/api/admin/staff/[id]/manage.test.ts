// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/**
 * Захват учётной записи через раздел «Сотрудники» (issue #783, #785).
 *
 * 🔴 Проверка идёт **вызовом маршрута с настоящим репозиторием**, а не юнитом
 * на `update()`. Дефект, ради которого написан этот файл, юнит не показывает
 * вовсе: правило доступа было верным у `remove()` и отсутствовало у `update()`,
 * а стоило это ничего ровно до того дня, когда центральная карта разрешений
 * открыла `PATCH /staff/{id}` администратору с «Управлением людьми». Вопрос
 * тут не «проверяет ли репозиторий», а «доходит ли до него имя того, кто
 * правит» — и ответить на него может только связка страж → маршрут →
 * репозиторий целиком.
 *
 * Подменена одна база: всё, что выше неё, работает по-настоящему.
 */
const adminUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
const session = vi.hoisted(() => ({ deleteMany: vi.fn() }));

vi.mock('@/server/db', () => ({ db: { adminUser, session } }));

vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
  /* Argon2 здесь ни при чём: до записи пароля дело не доходит ни в одной
     проверке файла, а настоящий хеш стоит десятков миллисекунд. */
  hashPassword: vi.fn(async () => 'хеш'),
}));

import { getAdminSession } from '@/server/auth';

import { DELETE, PATCH } from './route';

const owner: AuthModuleTypes.AdminSession = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2030-01-01'),
};

/** Администратор, которому владелец открыл «Сотрудников» и «Управление людьми». */
const administrator: AuthModuleTypes.AdminSession = {
  ...owner,
  userId: 'u2',
  login: 'ivanova',
  role: 'admin',
  permissions: ['team', 'people', 'data_delete'],
};

/** Строка учётной записи, какой её читает репозиторий перед правкой. */
function row(id: string, role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'INSTALLER') {
  return {
    id,
    role,
    login: `login-${id}`,
    name: null,
    phone: null,
    permissions: [],
    employment: null,
    inn: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastLoginAt: null,
  };
}

function patchRequest(id: string, payload: unknown): NextRequest {
  return new NextRequest(`https://tulaklimat.ru/api/admin/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

function deleteRequest(id: string): NextRequest {
  return new NextRequest(`https://tulaklimat.ru/api/admin/staff/${id}`, { method: 'DELETE' });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function messageOf(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== 'object' || body === null || !('error' in body)) return '';

  const error: unknown = body.error;
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';

  return typeof error.message === 'string' ? error.message : '';
}

const REFUSAL = 'Эту учётную запись правит только владелец';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(administrator);
  adminUser.update.mockImplementation(async ({ where }: { where: { id: string } }) =>
    row(where.id, 'INSTALLER'),
  );
  adminUser.delete.mockResolvedValue(row('u4', 'INSTALLER'));
});

describe('🔴 администратор и учётная запись владельца', () => {
  beforeEach(() => {
    adminUser.findUnique.mockResolvedValue(row('u1', 'OWNER'));
  });

  /* 🔴 Это и есть захват панели: пароль владельца известен тому, кто его
     поставил, а все сессии владельца гасятся тем же запросом. Дальше —
     вход владельцем и восемнадцать разрешений себе. */
  it('пароль владельца не переписывает', async () => {
    const response = await PATCH(
      patchRequest('u1', { password: 'novyj-parol-2026' }),
      context('u1'),
    );

    expect({ status: response.status, message: await messageOf(response) }).toEqual({
      status: 403,
      message: REFUSAL,
    });
    expect(adminUser.update).not.toHaveBeenCalled();
    expect(session.deleteMany).not.toHaveBeenCalled();
  });

  it('доступ владельцу не отключает — иначе панель заперта снаружи', async () => {
    const response = await PATCH(patchRequest('u1', { active: false }), context('u1'));

    expect(response.status).toBe(403);
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it('логин владельцу не меняет', async () => {
    const response = await PATCH(patchRequest('u1', { login: 'chuzhoj' }), context('u1'));

    expect(response.status).toBe(403);
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it('владельца не удаляет', async () => {
    const response = await DELETE(deleteRequest('u1'), context('u1'));

    expect(response.status).toBe(403);
    expect(adminUser.delete).not.toHaveBeenCalled();
  });
});

describe('🔴 администратор и равный администратор', () => {
  beforeEach(() => {
    adminUser.findUnique.mockResolvedValue(row('u3', 'ADMIN'));
  });

  /* 🔴 Сброс пароля равному — это его набор разрешений, то есть обход
     обещания «администратор не меняет ни свои, ни чужие права» без единого
     обращения к `/access`. */
  it('пароль равному не сбрасывает: это его набор разрешений', async () => {
    const response = await PATCH(
      patchRequest('u3', { password: 'novyj-parol-2026' }),
      context('u3'),
    );

    expect({ status: response.status, message: await messageOf(response) }).toEqual({
      status: 403,
      message: REFUSAL,
    });
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it('равного не удаляет', async () => {
    const response = await DELETE(deleteRequest('u3'), context('u3'));

    expect(response.status).toBe(403);
    expect(adminUser.delete).not.toHaveBeenCalled();
  });

  /* 🔴 Свою учётную запись правит каждый — это его профиль, и повышения тут
     нет. Кроме пароля: здесь он меняется без текущего, а значит сессия,
     забытая на чужом компьютере, стала бы постоянным доступом. */
  it('себя правит, но пароль себе ставит в профиле', async () => {
    adminUser.findUnique.mockResolvedValue(row('u2', 'ADMIN'));

    const renamed = await PATCH(patchRequest('u2', { name: 'Мария Иванова' }), context('u2'));
    const repassworded = await PATCH(
      patchRequest('u2', { password: 'novyj-parol-2026' }),
      context('u2'),
    );

    expect({ имя: renamed.status, пароль: repassworded.status }).toEqual({ имя: 200, пароль: 403 });
    expect(adminUser.update).toHaveBeenCalledTimes(1);
  });
});

describe('администратор и те, кем он управляет', () => {
  it('монтажника правит: ради этого переключатель и выдан', async () => {
    adminUser.findUnique.mockResolvedValue(row('u4', 'INSTALLER'));

    const response = await PATCH(patchRequest('u4', { name: 'Дмитрий Соколов' }), context('u4'));

    expect(response.status).toBe(200);
    expect(adminUser.update).toHaveBeenCalled();
  });

  it('менеджера правит', async () => {
    adminUser.findUnique.mockResolvedValue(row('u5', 'MANAGER'));

    const response = await PATCH(patchRequest('u5', { phone: '+7 910 155-24-68' }), context('u5'));

    expect(response.status).toBe(200);
  });

  it('монтажника удаляет', async () => {
    adminUser.findUnique.mockResolvedValue(row('u4', 'INSTALLER'));

    const response = await DELETE(deleteRequest('u4'), context('u4'));

    expect(response.status).toBe(204);
    expect(adminUser.delete).toHaveBeenCalledWith({ where: { id: 'u4' } });
  });
});

describe('владелец правит кого угодно', () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(owner);
  });

  it('свою учётную запись правит из раздела как раньше', async () => {
    adminUser.findUnique.mockResolvedValue(row('u1', 'OWNER'));

    const response = await PATCH(patchRequest('u1', { login: 'hozyain' }), context('u1'));

    expect(response.status).toBe(200);
  });

  /* Правило про свой пароль общее и владельца не выделяет: у него открытая
     панель стоит дороже всех. Менять пароль он идёт в профиль. */
  it('себе пароль ставит в профиле, а не в карточке', async () => {
    adminUser.findUnique.mockResolvedValue(row('u1', 'OWNER'));

    const response = await PATCH(
      patchRequest('u1', { password: 'novyj-parol-2026' }),
      context('u1'),
    );

    expect(response.status).toBe(403);
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it('администратора правит', async () => {
    adminUser.findUnique.mockResolvedValue(row('u3', 'ADMIN'));

    const response = await PATCH(patchRequest('u3', { name: 'Мария Иванова' }), context('u3'));

    expect(response.status).toBe(200);
  });
});
