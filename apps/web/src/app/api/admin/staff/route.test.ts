// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
  /* Argon2id считает хеш десятки миллисекунд — здесь проверяется доступ,
     а не стойкость пароля. */
  hashPassword: vi.fn(async () => 'хеш'),
}));

vi.mock('@/server/repo/admin-users', () => ({
  list: vi.fn(),
  createInstaller: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as adminUsers from '@/server/repo/admin-users';

import { GET, POST } from './route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const created = {
  id: 'u3',
  login: 'petrov',
  name: 'Иван Петров',
  phone: null,
  role: 'installer' as const,
  employment: null,
  inn: null,
  active: true,
  createdAt: '2026-08-25T09:00:00.000Z',
  lastLoginAt: null,
};

const body = {
  name: 'Иван Петров',
  login: 'petrov',
  phone: '',
  password: 'временный-пароль',
};

function jsonRequest(payload: unknown): NextRequest {
  return new NextRequest('https://tulaklimat.ru/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  vi.mocked(adminUsers.list).mockResolvedValue([created]);
  vi.mocked(adminUsers.createInstaller).mockResolvedValue(created);
});

describe('команда в админке', () => {
  it('без сессии список не отдаётся: это телефоны и логины людей', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(jsonRequest(body), undefined);

    expect(response.status).toBe(401);
    expect(adminUsers.list).not.toHaveBeenCalled();
  });

  it('🔴 монтажник не видит команду: проверка на сервере, а не скрытая кнопка', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET(jsonRequest(body), undefined);

    expect(response.status).toBe(403);
    expect(adminUsers.list).not.toHaveBeenCalled();
  });

  it('🔴 и завести себе коллегу тоже не может', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await POST(jsonRequest(body), undefined);

    expect(response.status).toBe(403);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });

  it('владелец заводит монтажника и получает 201', async () => {
    const response = await POST(jsonRequest(body), undefined);

    expect(response.status).toBe(201);
    expect(adminUsers.createInstaller).toHaveBeenCalledWith({
      name: 'Иван Петров',
      login: 'petrov',
      phone: null,
      employment: null,
      inn: null,
      passwordHash: 'хеш',
    });
  });

  it('🔴 без выбора оформление остаётся пустым, а не подставляется', async () => {
    /* Умолчание здесь решало бы за владельца, можно ли уменьшать человеку
       вознаграждение. Молчание — не разрешение (CRM.md §9). */
    await POST(jsonRequest({ ...body, employment: '' }), undefined);

    expect(adminUsers.createInstaller).toHaveBeenCalledWith(
      expect.objectContaining({ employment: null }),
    );
  });

  it('выбранное оформление доходит до базы', async () => {
    await POST(jsonRequest({ ...body, employment: 'self_employed' }), undefined);

    expect(adminUsers.createInstaller).toHaveBeenCalledWith(
      expect.objectContaining({ employment: 'self_employed' }),
    );
  });

  it('оформление вне словаря не принимается', async () => {
    const response = await POST(jsonRequest({ ...body, employment: 'подряд' }), undefined);

    expect(response.status).toBe(400);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });

  it('🔴 пароль наружу не возвращается ни в каком виде', async () => {
    const response = await POST(jsonRequest(body), undefined);
    const payload: unknown = await response.json();

    expect(JSON.stringify(payload)).not.toContain('хеш');
    expect(JSON.stringify(payload)).not.toContain(body.password);
  });

  it('короткий пароль не принимается: его подберут за вечер', async () => {
    const response = await POST(jsonRequest({ ...body, password: 'коротк' }), undefined);

    expect(response.status).toBe(400);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });

  it('логин кириллицей отклоняется — его диктуют по телефону', async () => {
    const response = await POST(jsonRequest({ ...body, login: 'петров' }), undefined);

    expect(response.status).toBe(400);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });
});

describe('ИНН при заведении монтажника', () => {
  it('🔴 пустой ИНН заводить не мешает: человека берут по телефону', async () => {
    const response = await POST(jsonRequest({ ...body, inn: '' }), undefined);

    expect(response.status).toBe(201);
    expect(adminUsers.createInstaller).toHaveBeenCalledWith(expect.objectContaining({ inn: null }));
  });

  it('поля нет в теле вовсе — тот же случай, что пустая строка', async () => {
    const response = await POST(jsonRequest(body), undefined);

    expect(response.status).toBe(201);
    expect(adminUsers.createInstaller).toHaveBeenCalledWith(expect.objectContaining({ inn: null }));
  });

  it('верный ИНН доходит до базы', async () => {
    await POST(jsonRequest({ ...body, inn: '710703123450' }), undefined);

    expect(adminUsers.createInstaller).toHaveBeenCalledWith(
      expect.objectContaining({ inn: '710703123450' }),
    );
  });

  it('пробелы из выписки вычищаются, а не ложатся в базу', async () => {
    await POST(jsonRequest({ ...body, inn: '7107 0312 3450' }), undefined);

    expect(adminUsers.createInstaller).toHaveBeenCalledWith(
      expect.objectContaining({ inn: '710703123450' }),
    );
  });

  it('🔴 ИНН с опиской отвергается: у ФНС он выглядит как несуществующий', async () => {
    const response = await POST(jsonRequest({ ...body, inn: '710512345678' }), undefined);

    expect(response.status).toBe(400);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });

  it('десять цифр — это ИНН организации, а не человека', async () => {
    const response = await POST(jsonRequest({ ...body, inn: '7107083893' }), undefined);

    expect(response.status).toBe(400);
    expect(adminUsers.createInstaller).not.toHaveBeenCalled();
  });
});
